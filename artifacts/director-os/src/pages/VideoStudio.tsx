import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Play,
  Settings2,
  Video,
  Wand2,
  Loader2,
  ArrowLeft,
  Check,
  Camera,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ShotData {
  id: number;
  promptSummary: string;
  shotType: string;
  thumbnailUrl: string | null;
  durationMs: number;
  status: string;
  cameraIntent: any;
  motionIntent: any;
  sceneIndex: number;
  shotIndex: number;
}

export default function VideoStudio() {
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const shotId = params.shotId ? parseInt(params.shotId) : null;
  const [, navigate] = useLocation();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId },
  });

  const [selectedShot, setSelectedShot] = useState<ShotData | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [cameraMotion, setCameraMotion] = useState("static");
  const [motionStrength, setMotionStrength] = useState([128]);
  const [vfx, setVfx] = useState("none");
  const [selectedModel, setSelectedModel] = useState("wan2gp");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const allShots: ShotData[] = useMemo(() => {
    if (!project?.scenes) return [];
    const result: ShotData[] = [];
    project.scenes.forEach((scene: any, sIdx: number) => {
      (scene.shots || []).forEach((shot: any, shIdx: number) => {
        result.push({
          id: shot.id,
          promptSummary: shot.promptSummary || "",
          shotType: shot.shotType || "medium",
          thumbnailUrl: shot.thumbnailUrl || null,
          durationMs: shot.durationMs || 3000,
          status: shot.status,
          cameraIntent: shot.cameraIntent,
          motionIntent: shot.motionIntent,
          sceneIndex: sIdx,
          shotIndex: shIdx,
        });
      });
    });
    return result;
  }, [project]);

  useEffect(() => {
    if (shotId && allShots.length > 0) {
      const found = allShots.find((s) => s.id === shotId);
      if (found) {
        setSelectedShot(found);
        setVideoPrompt(found.promptSummary);
        if (found.cameraIntent?.movement) {
          setCameraMotion(found.cameraIntent.movement);
        }
      }
    }
  }, [shotId, allShots]);

  const handleAIGeneratePrompt = async () => {
    if (!selectedShot) return;
    setIsGeneratingPrompt(true);

    try {
      const res = await fetch(`${BASE}/api/shots/${selectedShot.id}/generate-video-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to generate video prompt");

      const data = await res.json();
      setVideoPrompt(data.videoPrompt);
      setAiReasoning(data.reasoning || null);

      if (data.settings?.cameraMotion) {
        const motionMap: Record<string, string> = {
          "pan right": "pan-right",
          "pan left": "pan-left",
          "dolly in": "zoom-in",
          "dolly out": "zoom-out",
          orbit: "orbit",
          static: "static",
        };
        const mapped = motionMap[data.settings.cameraMotion.toLowerCase()] || "static";
        setCameraMotion(mapped);
      }

      if (data.settings?.motion) {
        const motionLevels: Record<string, number> = { low: 64, medium: 128, high: 200 };
        setMotionStrength([motionLevels[data.settings.motion] || 128]);
      }
    } catch (err: any) {
      setPromptError(err.message || "Failed to generate video prompt");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!selectedShot) return;
    setIsGeneratingVideo(true);
    setVideoError(null);

    try {
      const res = await fetch(`${BASE}/api/shots/${selectedShot.id}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          frames: Math.round((selectedShot.durationMs / 1000) * 24),
          motionStrength: motionStrength[0],
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Video generation failed");
      }

      const data = await res.json();
      setGeneratedVideoUrl(`${BASE}${data.videoUrl}`);
    } catch (err: any) {
      setVideoError(err.message);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0 z-10 shadow-2xl shadow-black/50">
        <div className="p-4 border-b border-border flex items-center gap-2 bg-background/50">
          <Settings2 className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold">Video Generation</h3>
        </div>

        <ScrollArea className="flex-1 p-5">
          <div className="space-y-6">
            {selectedShot && (
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">
                  SC{selectedShot.sceneIndex + 1}_SH{selectedShot.shotIndex + 1}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {selectedShot.shotType.replace(/_/g, " ")} shot
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Video Prompt
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAIGeneratePrompt}
                  disabled={isGeneratingPrompt || !selectedShot}
                  className="h-6 text-[10px] text-primary px-2"
                >
                  {isGeneratingPrompt ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  AI Generate
                </Button>
              </div>
              <Textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="h-28 bg-background border-white/10 resize-none text-sm leading-relaxed rounded-xl focus-visible:ring-primary/50"
                placeholder="Describe the motion and action for this shot..."
              />
            </div>

            {promptError && (
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-xs text-red-400 leading-relaxed">
                {promptError}
              </div>
            )}

            {aiReasoning && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-300/80 leading-relaxed">
                <div className="text-amber-400 font-semibold mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Reasoning
                </div>
                {aiReasoning}
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Video Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="bg-background border-white/10 rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wan2gp">Wan2GP (ComfyUI)</SelectItem>
                  <SelectItem value="ltx-video" disabled>LTX Video (Coming Soon)</SelectItem>
                  <SelectItem value="hunyuan-video" disabled>Hunyuan Video (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Camera Motion
              </Label>
              <Select value={cameraMotion} onValueChange={setCameraMotion}>
                <SelectTrigger className="bg-background border-white/10 rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static (Subject Motion Only)</SelectItem>
                  <SelectItem value="pan-right">Pan Right</SelectItem>
                  <SelectItem value="pan-left">Pan Left</SelectItem>
                  <SelectItem value="zoom-in">Slow Push In</SelectItem>
                  <SelectItem value="zoom-out">Slow Pull Out</SelectItem>
                  <SelectItem value="orbit">Orbit Subject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Motion Strength</Label>
                  <span className="text-xs text-foreground font-mono">{motionStrength[0]}</span>
                </div>
                <Slider
                  value={motionStrength}
                  onValueChange={setMotionStrength}
                  max={255}
                  className="py-2"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <Label className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                  VFX Layer
                </Label>
              </div>
              <Select value={vfx} onValueChange={setVfx}>
                <SelectTrigger className="bg-background border-white/10 rounded-xl h-11">
                  <SelectValue placeholder="Add VFX Overlay..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Effects</SelectItem>
                  <SelectItem value="fire">Cinematic Fire/Embers</SelectItem>
                  <SelectItem value="rain">Heavy Rain + Distortion</SelectItem>
                  <SelectItem value="lightning">Lightning Flashes</SelectItem>
                  <SelectItem value="smoke">Atmospheric Smoke</SelectItem>
                  <SelectItem value="particles">Particles / Dust</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background/50 space-y-2">
          <Button
            onClick={handleGenerateVideo}
            disabled={isGeneratingVideo || !videoPrompt.trim()}
            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white shadow-glow rounded-xl h-12 font-semibold"
          >
            {isGeneratingVideo ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Generate Video Clip
              </>
            )}
          </Button>
          <Link href={`/projects/${projectId}/editor`}>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground rounded-xl text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timeline
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#050505] relative">
        <div className="flex-1 p-8 flex flex-col items-center justify-center relative">
          <div className="w-full max-w-4xl aspect-[16/9] bg-background border border-white/10 rounded-xl overflow-hidden shadow-2xl relative group">
            {generatedVideoUrl ? (
              <video
                src={generatedVideoUrl}
                className="w-full h-full object-cover"
                controls
                autoPlay
                loop
              />
            ) : selectedShot?.thumbnailUrl ? (
              <img
                src={`${BASE}${selectedShot.thumbnailUrl}`}
                alt="Source Frame"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <Camera className="w-16 h-16" />
              </div>
            )}
            {!generatedVideoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 cursor-pointer hover:scale-110 transition-transform hover:bg-white/20">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>
            )}
            {!generatedVideoUrl && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end px-4 pb-3">
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                  <div className="w-0 h-full bg-primary" />
                </div>
              </div>
            )}
          </div>

          {isGeneratingVideo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-card/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Generating video via ComfyUI (Wan2GP)...
              </span>
            </motion.div>
          )}

          {videoError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm max-w-lg text-center"
            >
              {videoError}
            </motion.div>
          )}
        </div>

        <div className="h-32 border-t border-border bg-card/50 backdrop-blur-xl p-3 overflow-x-auto">
          <div className="flex gap-3 h-full">
            {allShots.map((shot) => (
              <button
                key={shot.id}
                onClick={() => {
                  setSelectedShot(shot);
                  setVideoPrompt(shot.promptSummary);
                  setAiReasoning(null);
                  setGeneratedVideoUrl(null);
                  if (shot.cameraIntent?.movement) {
                    setCameraMotion(shot.cameraIntent.movement);
                  }
                }}
                className={`w-40 h-full shrink-0 rounded-lg border overflow-hidden cursor-pointer transition-all relative group ${
                  selectedShot?.id === shot.id
                    ? "border-primary ring-1 ring-primary/50"
                    : "border-white/10 hover:border-primary/50"
                }`}
              >
                {shot.thumbnailUrl ? (
                  <img
                    src={`${BASE}${shot.thumbnailUrl}`}
                    alt={`Shot ${shot.id}`}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground/30">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-mono text-white/90 border border-white/10">
                  SC{shot.sceneIndex + 1}_SH{shot.shotIndex + 1}
                </div>
                {shot.status === "has_video" && (
                  <div className="absolute top-1 right-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
