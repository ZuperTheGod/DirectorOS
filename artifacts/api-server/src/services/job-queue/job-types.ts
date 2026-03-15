export const JOB_TYPES = {
  IMAGE_GENERATION: "image",
  VIDEO_GENERATION: "video",
  TIMELINE_RENDER: "render",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export interface ImageJobPayload {
  shotId: number;
  projectId: number;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
}

export interface VideoJobPayload {
  shotId: number;
  projectId: number;
  prompt: string;
  imageFilePath: string;
  frames?: number;
  motionStrength?: number;
  seed?: number;
}

export interface RenderJobPayload {
  projectId: number;
  audioPath?: string | null;
}
