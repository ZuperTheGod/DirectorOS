import { useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Video,
  Image as ImageIcon,
  Camera,
  Clock,
  LayoutTemplate,
  X,
  Sparkles,
  Loader2,
  ChevronRight,
  Wand2,
  Check,
  Pencil,
  SendHorizontal,
} from "lucide-react";
import {
  useGetProject,
  useCreateScene,
  useCreateShot,
  useUpdateShot,
  Shot,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Storyboard() {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId },
  });
  const { mutate: createScene, isPending: isCreatingScene } = useCreateScene();
  const { mutate: createShot } = useCreateShot();
  const { mutate: updateShot } = useUpdateShot();

  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [editForm, setEditForm] = useState({
    promptSummary: "",
    shotType: "medium",
    durationMs: 3000,
  });
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState({ current: 0, total: 0, message: "" });
  const [isSendingToTimeline, setIsSendingToTimeline] = useState(false);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
  }, [queryClient, projectId]);

  const handleAddScene = () => {
    const nextOrder = project?.scenes?.length || 0;
    createScene(
      { projectId, data: { name: `Scene ${nextOrder + 1}`, orderIndex: nextOrder } },
      { onSuccess: invalidate }
    );
  };

  const handleAddShot = (sceneId: number, currentShotCount: number) => {
    createShot(
      { sceneId, data: { orderIndex: currentShotCount, shotType: "medium", durationMs: 3000 } },
      { onSuccess: invalidate }
    );
  };

  const openShotEditor = (shot: Shot) => {
    setEditingShot(shot);
    setEditForm({
      promptSummary: shot.promptSummary || "",
      shotType: shot.shotType || "medium",
      durationMs: shot.durationMs || 3000,
    });
  };

  const saveShotEdit = () => {
    if (!editingShot) return;
    updateShot(
      {
        shotId: editingShot.id,
        data: {
          promptSummary: editForm.promptSummary,
          shotType: editForm.shotType,
          durationMs: editForm.durationMs,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditingShot(null);
        },
      }
    );
  };

  const handleAutoGenerateAll = async () => {
    setIsAutoGenerating(true);
    setAutoGenProgress({ current: 0, total: 0, message: "Starting..." });

    try {
      const response = await fetch(`${BASE}/api/projects/${projectId}/generate-all-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Generation failed" }));
        setAutoGenProgress({ current: 0, total: 0, message: errData.error || "Failed to start generation" });
        setIsAutoGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "start") {
                setAutoGenProgress({ current: 0, total: data.total, message: data.message });
              } else if (data.type === "progress") {
                setAutoGenProgress({ current: data.current, total: data.total, message: data.message });
              } else if (data.type === "completed") {
                setAutoGenProgress((prev) => ({ ...prev, current: data.current, message: `Completed ${data.current}/${data.total}` }));
                invalidate();
              } else if (data.type === "error") {
                setAutoGenProgress((prev) => ({ ...prev, message: data.message || "Error generating image" }));
              } else if (data.type === "done") {
                invalidate();
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Auto-gen error:", err);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleSendToTimeline = async () => {
    setIsSendingToTimeline(true);
    try {
      const res = await fetch(`${BASE}/api/projects/${projectId}/clips/sync`, { method: "POST" });
      if (res.ok) {
        navigate(`/projects/${projectId}/editor`);
        return;
      }
    } catch (err) {
      console.error("Failed to send to timeline:", err);
    }
    setIsSendingToTimeline(false);
  };

  const allShots = project?.scenes?.flatMap((s) => s.shots || []) || [];
  const allHaveFrames = allShots.length > 0 && allShots.every((s: any) => s.thumbnailUrl);
  const shotsWithFrames = allShots.filter((s: any) => s.thumbnailUrl).length;
  const hasAnyShots = allShots.length > 0;
  const emptyShots = allShots.filter((s: any) => !s.thumbnailUrl).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "has_video": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "has_frame": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-secondary text-muted-foreground border-white/10";
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-primary/60 animate-pulse" /> Loading timeline...
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-card/30 shrink-0">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Storyboard Timeline</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasAnyShots
              ? `${allShots.length} shots across ${project?.scenes?.length || 0} scenes${emptyShots > 0 ? ` — ${emptyShots} need images` : ""}`
              : "Previsualize scenes and shots before generating video."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasAnyShots && emptyShots > 0 && (
            <Button
              onClick={handleAutoGenerateAll}
              disabled={isAutoGenerating}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-500/90 hover:to-orange-600/90 text-white rounded-xl shadow-glow"
            >
              {isAutoGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {autoGenProgress.message}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  AI Generate All Images ({emptyShots})
                </>
              )}
            </Button>
          )}
          {shotsWithFrames > 0 && (
            <Button
              onClick={handleSendToTimeline}
              disabled={isSendingToTimeline}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-500/90 hover:to-teal-600/90 text-white rounded-xl shadow-glow"
            >
              {isSendingToTimeline ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SendHorizontal className="w-4 h-4 mr-2" />
              )}
              Send to Timeline ({shotsWithFrames})
            </Button>
          )}
          {allHaveFrames && (
            <Link href={`/projects/${projectId}/editor`}>
              <Button className="bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl shadow-glow">
                <Check className="w-4 h-4 mr-2" />
                Accept & Continue to Timeline
              </Button>
            </Link>
          )}
          <Button
            onClick={handleAddScene}
            disabled={isCreatingScene}
            className="bg-secondary hover:bg-secondary/80 text-foreground border border-white/5 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Scene
          </Button>
        </div>
      </div>

      {isAutoGenerating && (
        <div className="px-8 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-4">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <div className="flex-1">
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                animate={{ width: autoGenProgress.total > 0 ? `${(autoGenProgress.current / autoGenProgress.total) * 100}%` : "0%" }}
              />
            </div>
          </div>
          <span className="text-sm text-amber-400 font-mono">
            {autoGenProgress.current}/{autoGenProgress.total}
          </span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <ScrollArea className="flex-1 p-8">
          <div className="flex flex-col gap-10">
            {project?.scenes?.length === 0 ? (
              <div className="m-auto text-center max-w-sm py-20">
                <LayoutTemplate className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-display font-semibold mb-2">No scenes yet</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Ask the AI Director to generate a storyboard or add your first scene manually.
                </p>
                <Button onClick={handleAddScene} className="bg-primary text-white rounded-xl shadow-glow">
                  Create First Scene
                </Button>
              </div>
            ) : (
              project?.scenes?.map((scene, sIdx) => (
                <div key={scene.id} className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 sticky left-0 w-max">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                        <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">
                          SC {sIdx + 1}
                        </span>
                        {scene.name}
                      </h3>
                      {scene.summary && (
                        <p className="text-sm text-muted-foreground max-w-xl truncate mt-1">
                          {scene.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-stretch gap-4 pb-4 min-w-max">
                    {scene.shots?.map((shot: Shot, idx: number) => (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={shot.id}
                        className={`w-72 flex-shrink-0 bg-card border rounded-2xl overflow-hidden shadow-lg transition-colors group cursor-pointer ${
                          editingShot?.id === shot.id
                            ? "border-primary ring-1 ring-primary/50"
                            : "border-white/10 hover:border-primary/50"
                        }`}
                        onClick={() => openShotEditor(shot)}
                      >
                        <div className="h-40 bg-background relative border-b border-border flex items-center justify-center overflow-hidden">
                          {shot.thumbnailUrl ? (
                            <img
                              src={`${BASE}${shot.thumbnailUrl}`}
                              alt="Shot"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 bg-gradient-to-br from-white/5 to-transparent">
                              <ImageIcon className="w-8 h-8 mb-2" />
                              <span className="text-xs font-medium uppercase tracking-widest">
                                Empty Frame
                              </span>
                            </div>
                          )}

                          <div className="absolute top-3 left-3 flex gap-2">
                            <span
                              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${getStatusColor(
                                shot.status
                              )}`}
                            >
                              {shot.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 text-xs font-mono text-white/90">
                            <Clock className="w-3 h-3" />
                            {(shot.durationMs || 3000) / 1000}s
                          </div>

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                            <Link
                              href={`/projects/${projectId}/image-studio/${shot.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="icon"
                                variant="secondary"
                                className="w-10 h-10 rounded-full bg-white text-black hover:bg-white/90 hover:scale-110 transition-transform"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="w-10 h-10 rounded-full bg-primary text-white hover:bg-primary/90 shadow-glow hover:scale-110 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                openShotEditor(shot);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-foreground font-semibold font-mono text-sm">
                              <span className="text-muted-foreground/50">SH</span> {sIdx + 1}.{idx + 1}
                            </div>
                            {shot.shotType && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md border border-white/5">
                                <Camera className="w-3 h-3" />
                                <span className="capitalize">{shot.shotType.replace("_", " ")}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {shot.promptSummary || "No prompt generated yet."}
                          </p>
                        </div>
                      </motion.div>
                    ))}

                    <button
                      onClick={() => handleAddShot(scene.id, scene.shots?.length || 0)}
                      className="w-24 flex-shrink-0 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <Plus className="w-6 h-6 mb-2" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Add Shot</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <AnimatePresence>
          {editingShot && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-5 border-b border-border flex items-center justify-between bg-background/50">
                <h3 className="font-display font-semibold">Edit Shot</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full"
                  onClick={() => setEditingShot(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-5">
                <div className="space-y-5">
                  {editingShot.thumbnailUrl && (
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={`${BASE}${editingShot.thumbnailUrl}`}
                        alt="Shot preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Shot Type
                    </Label>
                    <Select
                      value={editForm.shotType}
                      onValueChange={(v) => setEditForm((p) => ({ ...p, shotType: v }))}
                    >
                      <SelectTrigger className="bg-background border-white/10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["wide", "medium", "close_up", "extreme_close_up", "tracking", "establishing", "over_shoulder", "pov", "aerial", "dutch_angle"].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Duration (seconds)
                    </Label>
                    <Input
                      type="number"
                      value={editForm.durationMs / 1000}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          durationMs: parseFloat(e.target.value) * 1000 || 3000,
                        }))
                      }
                      className="bg-background border-white/10 rounded-xl"
                      min={1}
                      max={30}
                      step={0.5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Visual Description
                    </Label>
                    <Textarea
                      value={editForm.promptSummary}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, promptSummary: e.target.value }))
                      }
                      className="h-32 bg-background border-white/10 resize-none text-sm leading-relaxed rounded-xl"
                      placeholder="Describe what we see in this shot..."
                    />
                  </div>
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border bg-background/50 space-y-2">
                <Button
                  onClick={saveShotEdit}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Link href={`/projects/${projectId}/image-studio/${editingShot.id}`}>
                  <Button
                    variant="outline"
                    className="w-full border-primary/50 text-primary hover:bg-primary/10 rounded-xl"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {editingShot.thumbnailUrl ? "Regenerate Image" : "Generate Image"}
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
