import type { JobType } from "./job-types";

export type GPUIntensity = "none" | "low" | "high";

const JOB_GPU_MAP: Record<string, GPUIntensity> = {
  image: "low",
  video: "high",
  render: "none",
};

interface GPUState {
  busy: boolean;
  currentJobId: number | null;
  currentJobType: string | null;
  startedAt: Date | null;
}

const gpuState: GPUState = {
  busy: false,
  currentJobId: null,
  currentJobType: null,
  startedAt: null,
};

export function getGPUIntensity(jobType: string): GPUIntensity {
  return JOB_GPU_MAP[jobType] || "none";
}

export function isGPUBusy(): boolean {
  return gpuState.busy;
}

export function claimGPU(jobId: number, jobType: string): boolean {
  if (gpuState.busy) return false;
  gpuState.busy = true;
  gpuState.currentJobId = jobId;
  gpuState.currentJobType = jobType;
  gpuState.startedAt = new Date();
  console.log(`[GPUScheduler] GPU claimed by job #${jobId} (${jobType})`);
  return true;
}

export function releaseGPU(jobId: number): void {
  if (gpuState.currentJobId === jobId) {
    console.log(`[GPUScheduler] GPU released by job #${jobId}`);
    gpuState.busy = false;
    gpuState.currentJobId = null;
    gpuState.currentJobType = null;
    gpuState.startedAt = null;
  }
}

export function canProcessJob(jobType: string): boolean {
  const intensity = getGPUIntensity(jobType);

  if (intensity === "none") {
    return true;
  }

  if (intensity === "low" && !gpuState.busy) {
    return true;
  }

  if (intensity === "high" && !gpuState.busy) {
    return true;
  }

  return false;
}

export function getGPUStatus(): {
  busy: boolean;
  currentJobId: number | null;
  currentJobType: string | null;
  uptimeMs: number | null;
} {
  return {
    busy: gpuState.busy,
    currentJobId: gpuState.currentJobId,
    currentJobType: gpuState.currentJobType,
    uptimeMs: gpuState.startedAt ? Date.now() - gpuState.startedAt.getTime() : null,
  };
}
