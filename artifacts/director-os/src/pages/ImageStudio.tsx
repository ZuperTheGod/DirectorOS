import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  SlidersHorizontal,
  Image as ImageIcon,
  Sparkles,
  RefreshCcw,
  Maximize,
  Loader2,
  ArrowLeft,
  Check,
  X,
  Pencil,
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
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ShotData {
  id: number;
  promptSummary: string;
  shotType: string;
  thumbnailUrl: string | null;
  durationMs: number;
  status: string;
}

export default function ImageStudio() {
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  const shotId = params.shotId ? parseInt(params.shotId) : null;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId },
  });

  const [shot, setShot] = useState<ShotData | null>(null);
  const [prompt, setPrompt] = useState("");
  const [shotType, setShotType] = useState("medium");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);

  useEffect(() => {
    if (project && shotId) {
      for (const scene of project.scenes || []) {
        const found = scene.shots?.find((s: any) => s.id === shotId);
        if (found) {
          setShot({
            id: found.id,
            promptSummary: found.promptSummary || "",
            shotType: found.shotType || "medium",
            thumbnailUrl: found.thumbnailUrl || null,
            durationMs: found.durationMs || 3000,
            status: found.status,
          });
          setPrompt(found.promptSummary || "");
          setShotType(found.shotType || "medium");
          if (found.thumbnailUrl) {
            setGeneratedImage(`${BASE}${found.thumbnailUrl}`);
          }
          break;
        }
      }
    }
  }, [project, shotId]);

  const handleGenerate = async () => {
    if (!shotId) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`${BASE}/api/shots/${shotId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, shotType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      const imageUrl = `${BASE}${data.imageUrl}`;
      setGeneratedImage(imageUrl);
      setVariants((prev) => [imageUrl, ...prev].slice(0, 8));
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    navigate(`/projects/${projectId}/storyboard`);
  };

  const handleBack = () => {
    navigate(`/projects/${projectId}/storyboard`);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-2 bg-background/50">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold">Generation Settings</h3>
        </div>

        <ScrollArea className="flex-1 p-5">
          <div className="space-y-6">
            {shotId && (
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">
                  Shot #{shotId}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {shotType.replace(/_/g, " ")} shot
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Shot Type
              </Label>
              <Select value={shotType} onValueChange={setShotType}>
                <SelectTrigger className="bg-background border-white/10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["wide", "medium", "close_up", "extreme_close_up", "tracking", "establishing", "over_shoulder", "pov", "aerial", "dutch_angle"].map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Image Prompt
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="h-40 bg-background border-white/10 resize-none text-sm leading-relaxed rounded-xl focus-visible:ring-primary/50"
                placeholder="Describe the shot in detail..."
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Negative Prompt
              </Label>
              <Textarea
                placeholder="ugly, blurry, bad anatomy, cartoon, low quality..."
                className="h-16 bg-background border-white/10 resize-none text-sm rounded-xl focus-visible:ring-primary/50"
              />
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background/50 space-y-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white shadow-glow rounded-xl h-12 font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {generatedImage ? "Regenerate Image" : "Generate Image"}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
        {shotId && (
          <div className="absolute top-4 left-4 z-10">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-full px-4 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Storyboard
            </Button>
          </div>
        )}

        {generatedImage && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              onClick={handleAccept}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 shadow-lg"
            >
              <Check className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              variant="ghost"
              className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-full px-4"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        <div className="flex-1 p-8 flex items-center justify-center relative">
          <div className="w-full max-w-4xl aspect-[16/9] border border-white/5 rounded-xl shadow-2xl relative bg-background overflow-hidden flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Generating your shot...
                </p>
              </div>
            ) : generatedImage ? (
              <img
                src={generatedImage}
                alt="Generated shot"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground/40">
                <ImageIcon className="w-16 h-16" />
                <p className="text-sm">
                  {shotId
                    ? "Write a prompt and generate your shot"
                    : "Select a shot from the storyboard"}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="w-64 border-l border-border bg-card flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border bg-background/50">
          <h3 className="font-display font-semibold text-sm">Variants</h3>
        </div>

        <ScrollArea className="flex-1 p-4">
          {variants.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {variants.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setGeneratedImage(url)}
                  className={`aspect-square rounded-lg border overflow-hidden cursor-pointer transition-colors ${
                    generatedImage === url
                      ? "border-primary ring-1 ring-primary/50"
                      : "border-white/10 hover:border-primary/50"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Variant ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <ImageIcon className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-xs">Generated variants will appear here</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
