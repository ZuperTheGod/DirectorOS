import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Layers,
  Music,
  Wand2,
  Plus,
  ChevronRight,
  Video,
  GripVertical,
  Volume2,
  Loader2,
  Check,
  Image as ImageIcon,
  FolderOpen,
  RefreshCcw,
} from "lucide-react";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TimelineClip {
  shotId: number;
  sceneIndex: number;
  shotIndex: number;
  label: string;
  durationMs: number;
  thumbnailUrl: string | null;
  promptSummary: string;
  shotType: string;
  hasVideo: boolean;
}

interface LibraryClip {
  id: number;
  projectId: number;
  shotId: number | null;
  assetId: number | null;
  clipType: string;
  label: string | null;
  durationMs: number | null;
  asset: {
    id: number;
    storageUri: string;
    thumbnailUri: string | null;
    assetType: string;
  } | null;
}

type SidebarTab = "inspector" | "clips";

export default function Editor() {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId },
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [selectedClipIdx, setSelectedClipIdx] = useState<number | null>(null);
  const [resizingClip, setResizingClip] = useState<number | null>(null);
  const [clipDurations, setClipDurations] = useState<Record<number, number>>({});
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("inspector");
  const [libraryClips, setLibraryClips] = useState<LibraryClip[]>([]);
  const [isSyncingClips, setIsSyncingClips] = useState(false);

  const clips: TimelineClip[] = useMemo(() => {
    if (!project?.scenes) return [];
    const result: TimelineClip[] = [];
    project.scenes.forEach((scene: any, sIdx: number) => {
      (scene.shots || []).forEach((shot: any, shIdx: number) => {
        result.push({
          shotId: shot.id,
          sceneIndex: sIdx,
          shotIndex: shIdx,
          label: `SC${sIdx + 1}_SH${shIdx + 1}`,
          durationMs: clipDurations[shot.id] || shot.durationMs || 3000,
          thumbnailUrl: shot.thumbnailUrl,
          promptSummary: shot.promptSummary || "",
          shotType: shot.shotType || "medium",
          hasVideo: shot.status === "has_video",
        });
      });
    });
    return result;
  }, [project, clipDurations]);

  const totalDurationMs = clips.reduce((sum, c) => sum + c.durationMs, 0);
  const pxPerMs = 0.15;
  const totalWidth = Math.max(totalDurationMs * pxPerMs, 800);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const frames = Math.floor((ms % 1000) / (1000 / 24));
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  const currentClip = useMemo(() => {
    let elapsed = 0;
    for (let i = 0; i < clips.length; i++) {
      if (currentTimeMs >= elapsed && currentTimeMs < elapsed + clips[i].durationMs) {
        return i;
      }
      elapsed += clips[i].durationMs;
    }
    return clips.length - 1;
  }, [currentTimeMs, clips]);

  const previewClip = selectedClipIdx !== null ? clips[selectedClipIdx] : clips[currentClip];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeMs((prev) => {
        if (prev >= totalDurationMs) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, totalDurationMs]);

  const handleClipResize = (shotId: number, delta: number) => {
    setClipDurations((prev) => {
      const current = prev[shotId] || clips.find((c) => c.shotId === shotId)?.durationMs || 3000;
      return { ...prev, [shotId]: Math.max(1000, current + delta) };
    });
  };

  const fetchLibraryClips = async () => {
    try {
      const res = await fetch(`${BASE}/api/projects/${projectId}/clips`);
      if (res.ok) {
        const data = await res.json();
        setLibraryClips(data);
      }
    } catch {}
  };

  const syncClips = async () => {
    setIsSyncingClips(true);
    try {
      const res = await fetch(`${BASE}/api/projects/${projectId}/clips/sync`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLibraryClips(data.clips);
      }
    } catch {}
    setIsSyncingClips(false);
  };

  useEffect(() => {
    if (projectId && sidebarTab === "clips") {
      fetchLibraryClips();
    }
  }, [projectId, sidebarTab]);

  const playheadPosition = currentTimeMs * pxPerMs;

  const imageClips = libraryClips.filter(c => c.clipType === "image");
  const videoClips = libraryClips.filter(c => c.clipType === "video");
  const audioClips = libraryClips.filter(c => c.clipType === "audio");

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <div className="flex-1 flex min-h-0 border-b border-border">
        <div className="w-72 border-r border-border bg-card/50 flex flex-col">
          <div className="p-3 border-b border-border flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 text-xs ${sidebarTab === "inspector" ? "bg-secondary" : ""}`}
              onClick={() => setSidebarTab("inspector")}
            >
              Inspector
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 text-xs ${sidebarTab === "clips" ? "bg-secondary" : ""}`}
              onClick={() => setSidebarTab("clips")}
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              Clip Library
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {sidebarTab === "inspector" ? (
              selectedClipIdx !== null && previewClip ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Selected Clip
                    </h4>
                    <div className="p-3 bg-background rounded-xl border border-white/5">
                      <div className="text-sm font-mono font-bold text-primary">{previewClip.label}</div>
                      <div className="text-xs text-muted-foreground capitalize mt-1">
                        {previewClip.shotType.replace(/_/g, " ")} shot
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Duration
                    </h4>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg border-white/10"
                        onClick={() => handleClipResize(previewClip.shotId, -500)}
                      >
                        -
                      </Button>
                      <div className="flex-1 text-center font-mono text-sm">
                        {(previewClip.durationMs / 1000).toFixed(1)}s
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg border-white/10"
                        onClick={() => handleClipResize(previewClip.shotId, 500)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Description
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {previewClip.promptSummary}
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Link href={`/projects/${projectId}/video-studio/${previewClip.shotId}`}>
                      <Button
                        variant="outline"
                        className="w-full border-primary/50 text-primary hover:bg-primary/10 rounded-xl text-sm"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Open in Video Studio
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-background rounded-xl border border-white/5">
                    <div className="text-sm font-semibold">{clips.length} clips</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Total: {formatTime(totalDurationMs)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click on a clip to inspect and adjust. Drag clip edges to change duration.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Assets
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={syncClips}
                    disabled={isSyncingClips}
                  >
                    {isSyncingClips ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCcw className="w-3 h-3 mr-1" />
                    )}
                    Sync
                  </Button>
                </div>

                {libraryClips.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No clips yet. Generate images or videos, then click Sync.
                    </p>
                  </div>
                ) : (
                  <>
                    {imageClips.length > 0 && (
                      <div>
                        <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Images ({imageClips.length})
                        </h5>
                        <div className="grid grid-cols-2 gap-1.5">
                          {imageClips.map((clip) => (
                            <div
                              key={clip.id}
                              className="rounded-lg overflow-hidden border border-white/5 bg-background aspect-square relative group cursor-grab"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("clip-id", String(clip.id));
                                e.dataTransfer.setData("clip-type", clip.clipType);
                              }}
                            >
                              {clip.asset?.storageUri ? (
                                <img
                                  src={`${BASE}${clip.asset.storageUri}`}
                                  alt={clip.label || ""}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                                <span className="text-[9px] text-white/80 truncate block">
                                  {clip.label || `Image ${clip.id}`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {videoClips.length > 0 && (
                      <div>
                        <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2 flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          Videos ({videoClips.length})
                        </h5>
                        <div className="grid grid-cols-2 gap-1.5">
                          {videoClips.map((clip) => (
                            <div
                              key={clip.id}
                              className="rounded-lg overflow-hidden border border-white/5 bg-background aspect-video relative group cursor-grab"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("clip-id", String(clip.id));
                                e.dataTransfer.setData("clip-type", clip.clipType);
                              }}
                            >
                              {clip.asset?.thumbnailUri ? (
                                <img
                                  src={`${BASE}${clip.asset.thumbnailUri}`}
                                  alt={clip.label || ""}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                                <span className="text-[9px] text-white/80 truncate block">
                                  {clip.label || `Video ${clip.id}`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {audioClips.length > 0 && (
                      <div>
                        <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          Audio ({audioClips.length})
                        </h5>
                        {audioClips.map((clip) => (
                          <div
                            key={clip.id}
                            className="p-2 rounded-lg border border-white/5 bg-background mb-1 cursor-grab flex items-center gap-2"
                            draggable
                          >
                            <Volume2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="text-xs truncate">{clip.label || `Audio ${clip.id}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center p-6 relative">
          <div className="w-full max-w-3xl aspect-[16/9] bg-black border border-white/10 rounded-lg shadow-2xl relative overflow-hidden">
            {previewClip?.thumbnailUrl ? (
              <img
                src={`${BASE}${previewClip.thumbnailUrl}`}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <Video className="w-12 h-12" />
              </div>
            )}
            <div className="absolute inset-[10%] border border-white/10 border-dashed pointer-events-none hidden lg:block" />
          </div>

          <div className="mt-6 flex items-center gap-4 bg-card/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/5">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-white rounded-full"
              onClick={() => setCurrentTimeMs(0)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              className="bg-primary hover:bg-primary/90 text-white rounded-full w-10 h-10 shadow-glow"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-white rounded-full"
              onClick={() => setCurrentTimeMs(totalDurationMs)}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <div className="font-mono text-sm text-primary">{formatTime(currentTimeMs)}</div>
            <div className="text-muted-foreground/50 text-xs">/ {formatTime(totalDurationMs)}</div>
          </div>
        </div>
      </div>

      <div className="h-72 bg-card flex flex-col shrink-0 relative">
        <div className="h-10 border-b border-border bg-background/80 flex items-center px-4 gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-muted-foreground mr-2" />
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
              <Layers className="w-3 h-3 mr-1.5" />
              Transitions
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
              <Music className="w-3 h-3 mr-1.5" />
              Add Audio
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/video-studio`}>
              <Button className="h-7 text-xs bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg shadow-glow px-4">
                <Wand2 className="w-3 h-3 mr-1.5" />
                AI Generate All Videos
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/video-studio`}>
              <Button className="h-7 text-xs bg-emerald-600 text-white rounded-lg px-4">
                <Check className="w-3 h-3 mr-1.5" />
                Continue to Video Studio
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-auto relative bg-[#0f0f13]">
          <div className="sticky top-0 z-30 h-6 bg-[#0a0a0e] border-b border-white/5 flex" style={{ width: totalWidth + 96 }}>
            <div className="w-24 shrink-0 border-r border-border bg-card" />
            <div className="flex-1 relative">
              {Array.from({ length: Math.ceil(totalDurationMs / 1000) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: i * 1000 * pxPerMs }}
                >
                  <div className="w-px h-full bg-white/10" />
                  <span className="absolute top-0 text-[9px] text-muted-foreground/50 font-mono ml-1">
                    {i}s
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute top-0 bottom-0 w-px bg-primary z-40 pointer-events-none shadow-[0_0_10px_rgba(139,92,246,1)]"
            style={{ left: 96 + playheadPosition }}
          />
          <div
            className="absolute top-0 w-3 h-3 bg-primary rounded-sm z-40 pointer-events-none -translate-x-[5px]"
            style={{ left: 96 + playheadPosition }}
          />

          <div className="flex flex-col">
            <div className="flex h-20 border-b border-white/5 relative group">
              <div className="w-24 bg-card border-r border-border shrink-0 flex items-center px-2 text-xs text-muted-foreground font-mono border-l-2 border-l-blue-500">
                V1
              </div>
              <div className="flex-1 relative flex items-stretch py-1" style={{ width: totalWidth }}>
                {clips.map((clip, idx) => {
                  let startX = 0;
                  for (let i = 0; i < idx; i++) startX += clips[i].durationMs * pxPerMs;
                  const clipWidth = clip.durationMs * pxPerMs;

                  return (
                    <div
                      key={clip.shotId}
                      className={`absolute top-1 bottom-1 rounded-lg border overflow-hidden cursor-pointer transition-all ${
                        selectedClipIdx === idx
                          ? "border-primary ring-1 ring-primary/50 z-10"
                          : "border-blue-500/40 hover:border-primary/50"
                      }`}
                      style={{ left: startX, width: clipWidth }}
                      onClick={() => { setSelectedClipIdx(idx); setSidebarTab("inspector"); }}
                    >
                      <div className="w-full h-full bg-blue-600/20 relative flex items-center overflow-hidden">
                        {clip.thumbnailUrl && (
                          <img
                            src={`${BASE}${clip.thumbnailUrl}`}
                            alt={clip.label}
                            className="absolute inset-0 w-full h-full object-cover opacity-40"
                          />
                        )}
                        <div className="relative z-10 px-2 py-1 flex items-center gap-1">
                          <span className="text-[10px] text-blue-200 font-medium truncate">
                            {clip.label}
                          </span>
                        </div>
                      </div>
                      <div
                        className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize bg-white/0 hover:bg-white/20 transition-colors"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startDuration = clip.durationMs;

                          const onMove = (ev: MouseEvent) => {
                            const delta = ev.clientX - startX;
                            const durationDelta = delta / pxPerMs;
                            setClipDurations((prev) => ({
                              ...prev,
                              [clip.shotId]: Math.max(1000, startDuration + durationDelta),
                            }));
                          };

                          const onUp = () => {
                            document.removeEventListener("mousemove", onMove);
                            document.removeEventListener("mouseup", onUp);
                          };

                          document.addEventListener("mousemove", onMove);
                          document.addEventListener("mouseup", onUp);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex h-16 border-b border-white/5 relative group">
              <div className="w-24 bg-card border-r border-border shrink-0 flex items-center px-2 text-xs text-muted-foreground font-mono border-l-2 border-l-emerald-500">
                <Volume2 className="w-3 h-3 mr-1" />
                A1
              </div>
              <div className="flex-1 relative" style={{ width: totalWidth }}>
                <div className="absolute inset-1 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-xs text-muted-foreground/30">
                  Drag audio files here or click Add Audio
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
