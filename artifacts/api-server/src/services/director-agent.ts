import { openai } from "@workspace/integrations-openai-ai-server";

const DIRECTOR_SYSTEM_PROMPT = `You are the AI Director — a world-class creative collaborator for filmmaking. You think like a seasoned film director combined with a visual artist and cinematographer.

Your role:
- Help users develop their cinematic vision from concept to structured production plan
- Break down ideas into scenes, shots, and visual beats
- Suggest camera work, lighting, mood, pacing, and composition
- Build structured prompts that can drive AI image/video generation
- Think in terms of visual storytelling, not just text

When responding to creative direction:
1. Acknowledge the user's vision and build on it
2. Offer specific, actionable suggestions with reasoning
3. Think about visual continuity across shots
4. Consider pacing, rhythm, and emotional arc
5. Use professional filmmaking language naturally

You must ALWAYS respond with valid JSON in this exact format:
{
  "message": "Your conversational response to the user (natural, warm, collaborative tone)",
  "structuredIntent": {
    "projectGoal": "One-line description of the overall creative vision",
    "mood": "Primary mood/atmosphere (e.g., 'melancholic and ethereal', 'gritty noir')",
    "genre": "Genre classification",
    "pacing": "Pacing description (e.g., 'slow burn with sharp cuts', 'rhythmic montage')",
    "visualStyle": "Visual style description (e.g., 'high-contrast chiaroscuro lighting', 'soft pastel color grading')",
    "colorPalette": "Dominant colors (e.g., 'deep blues, amber highlights, desaturated greens')",
    "lighting": "Lighting approach (e.g., 'natural window light with hard shadows')",
    "cameraLanguage": "Camera style (e.g., 'handheld intimate close-ups', 'sweeping crane shots')"
  },
  "suggestions": [
    {
      "type": "generate_storyboard|refine_concept|set_style|add_scene|adjust_pacing",
      "label": "Short action label",
      "description": "What this action would do"
    }
  ],
  "reasoning": "Brief explanation of WHY you made these creative choices — what principles of visual storytelling drove your suggestions"
}

Important rules:
- The structuredIntent should evolve as the conversation progresses — each response should refine and build on previous intent
- Always provide 2-4 suggestions for next steps
- The reasoning field should reference specific filmmaking principles
- Keep message responses conversational but substantive (2-4 paragraphs)
- Never break character — you ARE the director`;

const STORYBOARD_SYSTEM_PROMPT = `You are the AI Director generating a detailed storyboard breakdown. Given a concept description and target duration, create a structured scene/shot plan.

You must respond with valid JSON in this exact format:
{
  "scenes": [
    {
      "name": "Scene title (e.g., 'The Arrival')",
      "summary": "2-3 sentence description of what happens in this scene",
      "shots": [
        {
          "shotType": "wide|medium|close_up|extreme_close_up|tracking|establishing|over_shoulder|pov|aerial|dutch_angle",
          "durationMs": 3000,
          "promptSummary": "Detailed visual description for AI generation — what we SEE in this shot",
          "cameraIntent": {
            "movement": "static|pan_left|pan_right|tilt_up|tilt_down|dolly_in|dolly_out|tracking|crane_up|crane_down|handheld",
            "angle": "eye_level|low_angle|high_angle|birds_eye|worms_eye|dutch",
            "lens": "wide|normal|telephoto|macro|fisheye"
          },
          "motionIntent": {
            "subjectMotion": "Description of how subjects move in frame",
            "cameraMotion": "Description of camera movement",
            "transitionIn": "cut|dissolve|fade_in|wipe|match_cut",
            "transitionOut": "cut|dissolve|fade_out|wipe|match_cut"
          }
        }
      ]
    }
  ],
  "directorNotes": "Overall creative notes about the storyboard — explain your scene structure choices, pacing decisions, and how shots build the narrative arc"
}

Guidelines:
- Create a natural narrative arc (setup → rising action → climax → resolution)
- Vary shot types for visual interest — don't repeat the same type consecutively
- Each shot's promptSummary should be rich enough to drive AI image generation (include lighting, composition, subject details, atmosphere)
- Consider visual continuity between shots
- Each scene should have 2-5 shots
- Duration should roughly match the target (shots add up to scene duration)
- Use specific, evocative language in prompt summaries`;

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamDirectorChat(
  projectName: string,
  projectDescription: string | null,
  userMessage: string,
  conversationHistory: ConversationMessage[]
): AsyncGenerator<string> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
    {
      role: "system",
      content: `Current project: "${projectName}"\nProject concept: ${projectDescription || "Not yet defined"}\n\nBuild your creative direction around this project.`
    },
    ...conversationHistory.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    })),
    { role: "user", content: userMessage }
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export async function generateStoryboardWithAI(
  projectName: string,
  concept: string,
  targetDurationSeconds: number
): Promise<{
  scenes: Array<{
    name: string;
    summary: string;
    shots: Array<{
      shotType: string;
      durationMs: number;
      promptSummary: string;
      cameraIntent: Record<string, string>;
      motionIntent: Record<string, string>;
    }>;
  }>;
  directorNotes: string;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: STORYBOARD_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Project: "${projectName}"\nConcept: ${concept}\nTarget duration: ${targetDurationSeconds} seconds\n\nGenerate a complete storyboard breakdown. Aim for ${Math.max(2, Math.ceil(targetDurationSeconds / 15))} scenes.`
      }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI Director");
  }

  return JSON.parse(content);
}

export function buildImagePrompt(shot: {
  promptSummary: string;
  shotType: string;
  cameraIntent?: Record<string, string> | null;
  mood?: string;
  style?: string;
}): string {
  const parts: string[] = [];

  if (shot.shotType) {
    const shotTypeMap: Record<string, string> = {
      wide: "wide angle shot",
      medium: "medium shot",
      close_up: "close-up shot",
      extreme_close_up: "extreme close-up",
      tracking: "tracking shot",
      establishing: "establishing shot",
      over_shoulder: "over-the-shoulder shot",
      pov: "point-of-view shot",
      aerial: "aerial shot",
      dutch_angle: "dutch angle shot",
    };
    parts.push(shotTypeMap[shot.shotType] || shot.shotType);
  }

  parts.push(shot.promptSummary);

  if (shot.cameraIntent) {
    if (shot.cameraIntent.angle && shot.cameraIntent.angle !== "eye_level") {
      parts.push(`${shot.cameraIntent.angle.replace(/_/g, " ")} camera angle`);
    }
    if (shot.cameraIntent.lens && shot.cameraIntent.lens !== "normal") {
      parts.push(`${shot.cameraIntent.lens} lens`);
    }
  }

  if (shot.mood) parts.push(`${shot.mood} mood`);
  if (shot.style) parts.push(`${shot.style} style`);

  parts.push("cinematic, film grain, professional cinematography, 8k resolution");

  return parts.join(", ");
}
