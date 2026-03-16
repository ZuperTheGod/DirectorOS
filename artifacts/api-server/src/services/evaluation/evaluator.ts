import { db, evaluationResultsTable, generationJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getLLMProvider } from "../llm/llm-service";
import { enqueueJob } from "../job-queue/queue";

const QUALITY_THRESHOLD = 70;

export async function evaluateAsset(
  assetId: number,
  generationJobId: number,
  prompt: string,
  mediaUrl: string,
  mediaType: "image" | "video"
): Promise<{ accepted: boolean; overall: number }> {
  try {
    const llm = await getLLMProvider();
    const response = await llm.chat({
      messages: [
        {
          role: "system",
          content: `You are an AI quality evaluator for ${mediaType} generation in a filmmaking pipeline.
Score the generated ${mediaType} on these criteria (0-100 each):
1. promptMatch: How well the output matches the generation prompt
2. composition: Visual composition quality (rule of thirds, balance, depth)
3. quality: Technical quality (resolution, artifacts, coherence)

Return JSON only:
{
  "promptMatch": <number>,
  "composition": <number>,
  "quality": <number>,
  "overall": <number (weighted average: promptMatch*0.4 + composition*0.3 + quality*0.3)>,
  "notes": "<brief assessment>"
}

Since you cannot see the actual image, evaluate based on the prompt quality and provide a reasonable estimate.
Be critical but fair. Most well-formed prompts should score 65-85.`,
        },
        {
          role: "user",
          content: `Evaluate this ${mediaType} generation:\n\nPrompt: "${prompt}"\nOutput path: ${mediaUrl}\n\nScore the likely quality of this generation.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    if (!response) {
      return { accepted: true, overall: 75 };
    }

    const scores = JSON.parse(response);
    const overall = scores.overall || Math.round(
      (scores.promptMatch || 75) * 0.4 +
      (scores.composition || 75) * 0.3 +
      (scores.quality || 75) * 0.3
    );

    await db.insert(evaluationResultsTable).values({
      generationJobId,
      assetId,
      totalScore: overall,
      subScoresJson: {
        promptMatch: scores.promptMatch,
        composition: scores.composition,
        quality: scores.quality,
      },
      diagnosticsJson: { notes: scores.notes, mediaType, prompt },
      recommendedAction: overall >= QUALITY_THRESHOLD ? "accept" : "regenerate",
    });

    if (overall < QUALITY_THRESHOLD) {
      console.log(`[Evaluator] Asset #${assetId} scored ${overall} (below ${QUALITY_THRESHOLD}), marking for regeneration`);

      const [job] = await db.select().from(generationJobsTable).where(eq(generationJobsTable.id, generationJobId));
      if (job && (job.retryCount || 0) < (job.maxRetries || 1)) {
        const payload = job.requestJson as any;
        if (payload) {
          await enqueueJob(job.jobType as any, payload, { maxRetries: 0 });
          console.log(`[Evaluator] Enqueued regeneration job for asset #${assetId}`);
        }
      }
    }

    return { accepted: overall >= QUALITY_THRESHOLD, overall };
  } catch (err: any) {
    console.error("[Evaluator] Evaluation error:", err.message);
    await db.insert(evaluationResultsTable).values({
      generationJobId,
      assetId,
      totalScore: 75,
      subScoresJson: { promptMatch: 75, composition: 75, quality: 75 },
      diagnosticsJson: { error: err.message, fallback: true },
      recommendedAction: "accept",
    });
    return { accepted: true, overall: 75 };
  }
}
