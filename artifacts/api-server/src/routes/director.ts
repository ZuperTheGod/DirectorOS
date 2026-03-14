import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  scenesTable,
  shotsTable,
  userActionEventsTable,
} from "@workspace/db";
import {
  DirectorChatParams,
  DirectorChatBody,
  GenerateStoryboardParams,
  GenerateStoryboardBody,
  GenerateStoryboardResponse,
} from "@workspace/api-zod";
import {
  streamDirectorChat,
  generateStoryboardWithAI,
} from "../services/director-agent";

const router: IRouter = Router();

router.post(
  "/projects/:projectId/director/chat",
  async (req, res): Promise<void> => {
    const params = DirectorChatParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = DirectorChatBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.projectId));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      let fullResponse = "";
      const history = (parsed.data.conversationHistory || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const stream = streamDirectorChat(
        project.name,
        project.description,
        parsed.data.message,
        history
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      let structuredResponse: any = null;
      try {
        structuredResponse = JSON.parse(fullResponse);
      } catch {
        structuredResponse = {
          message: fullResponse,
          structuredIntent: null,
          suggestions: [],
          reasoning: null,
        };
      }

      res.write(
        `data: ${JSON.stringify({ done: true, parsed: structuredResponse })}\n\n`
      );
      res.end();

      try {
        await db.insert(userActionEventsTable).values({
          actionType: "director_chat",
          entityType: "project",
          entityId: project.id,
          payloadJson: {
            userMessage: parsed.data.message,
            aiResponseLength: fullResponse.length,
          },
        });
      } catch {}
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({ error: err.message || "AI Director error" })}\n\n`
      );
      res.end();
    }
  }
);

router.post(
  "/projects/:projectId/director/generate-storyboard",
  async (req, res): Promise<void> => {
    const params = GenerateStoryboardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = GenerateStoryboardBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.projectId));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    try {
      const targetDuration = parsed.data.targetDurationSeconds || 30;
      const aiResult = await generateStoryboardWithAI(
        project.name,
        parsed.data.concept,
        targetDuration
      );

      const createdScenes = [];
      let cumulativeTimeMs = 0;

      for (let i = 0; i < aiResult.scenes.length; i++) {
        const aiScene = aiResult.scenes[i];
        const sceneDurationMs = aiScene.shots.reduce(
          (sum, s) => sum + (s.durationMs || 3000),
          0
        );

        const [scene] = await db
          .insert(scenesTable)
          .values({
            projectId: project.id,
            name: aiScene.name,
            orderIndex: i,
            summary: aiScene.summary,
            startTimeMs: cumulativeTimeMs,
            endTimeMs: cumulativeTimeMs + sceneDurationMs,
          })
          .returning();

        const shots = [];
        for (let j = 0; j < aiScene.shots.length; j++) {
          const aiShot = aiScene.shots[j];
          const [shot] = await db
            .insert(shotsTable)
            .values({
              sceneId: scene.id,
              orderIndex: j,
              shotType: aiShot.shotType || "medium",
              durationMs: aiShot.durationMs || 3000,
              promptSummary: aiShot.promptSummary,
              cameraIntentJson: aiShot.cameraIntent || null,
              motionIntentJson: aiShot.motionIntent || null,
              status: "empty",
            })
            .returning();

          shots.push({
            ...shot,
            cameraIntent: shot.cameraIntentJson,
            motionIntent: shot.motionIntentJson,
            thumbnailUrl: shot.thumbnailUri,
          });
        }

        cumulativeTimeMs += sceneDurationMs;
        createdScenes.push({ ...scene, shots });
      }

      res.json(
        GenerateStoryboardResponse.parse({
          scenes: createdScenes,
          directorNotes: aiResult.directorNotes,
        })
      );

      try {
        await db.insert(userActionEventsTable).values({
          actionType: "generate_storyboard",
          entityType: "project",
          entityId: project.id,
          payloadJson: {
            concept: parsed.data.concept,
            sceneCount: createdScenes.length,
            shotCount: createdScenes.reduce(
              (sum, s) => sum + (s.shots?.length || 0),
              0
            ),
          },
        });
      } catch {}
    } catch (err: any) {
      console.error("Storyboard generation error:", err);
      res.status(500).json({
        error:
          err.message || "Failed to generate storyboard. Please try again.",
      });
    }
  }
);

export default router;
