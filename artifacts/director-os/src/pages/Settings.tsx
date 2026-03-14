import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Wifi,
  WifiOff,
  RefreshCcw,
  Loader2,
  Brain,
  Image as ImageIcon,
  Video,
  Film,
  Server,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ServiceStatus {
  name: string;
  connected: boolean;
  details?: Record<string, any>;
  error?: string;
}

interface ServicesResponse {
  services: ServiceStatus[];
  config: {
    lmstudio: { url: string; model: string };
    comfyui: { url: string };
  };
}

const SERVICE_ICONS: Record<string, typeof Brain> = {
  "LM Studio": Brain,
  ComfyUI: ImageIcon,
  "Wan2 Video": Video,
  FFmpeg: Film,
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "LM Studio": "Local LLM for AI Director reasoning, scene planning, and prompt optimization",
  ComfyUI: "Image generation workflows using Stable Diffusion and custom pipelines",
  "Wan2 Video": "Video generation from images using Wan2 models through ComfyUI",
  FFmpeg: "Timeline rendering and final video export",
};

export default function SettingsPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [config, setConfig] = useState<ServicesResponse["config"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testingService, setTestingService] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BASE}/api/services/status`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ServicesResponse = await res.json();
      setServices(data.services);
      setConfig(data.config);
    } catch {
      setServices([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStatus();
  };

  const handleTestService = async (serviceName: string) => {
    setTestingService(serviceName);
    try {
      const res = await fetch(`${BASE}/api/services/test/${serviceName.replace(/\s+/g, "")}`, {
        method: "POST",
      });
      const result = await res.json();
      setServices((prev) =>
        prev.map((s) => (s.name === serviceName ? { ...s, ...result } : s))
      );
    } catch {}
    setTestingService(null);
  };

  const connectedCount = services.filter((s) => s.connected).length;
  const totalCount = services.length;

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-card/30 shrink-0">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">AI Services</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? "Checking connections..."
              : `${connectedCount}/${totalCount} services connected`}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-secondary hover:bg-secondary/80 text-foreground border border-white/5 rounded-xl"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4 mr-2" />
          )}
          Refresh All
        </Button>
      </div>

      <ScrollArea className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {config && (
            <div className="p-5 bg-card border border-white/5 rounded-2xl space-y-3">
              <h3 className="text-sm font-display font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                Service Endpoints
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    LM Studio
                  </div>
                  <code className="text-xs text-foreground bg-background px-2 py-1 rounded-lg border border-white/5">
                    {config.lmstudio.url}
                  </code>
                  {config.lmstudio.model && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Model: {config.lmstudio.model}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    ComfyUI
                  </div>
                  <code className="text-xs text-foreground bg-background px-2 py-1 rounded-lg border border-white/5">
                    {config.comfyui.url}
                  </code>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              Checking service connections...
            </div>
          ) : (
            services.map((service, idx) => {
              const Icon = SERVICE_ICONS[service.name] || Server;
              const description = SERVICE_DESCRIPTIONS[service.name] || "";
              const isTesting = testingService === service.name;

              return (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-5 rounded-2xl border transition-colors ${
                    service.connected
                      ? "bg-card border-emerald-500/20"
                      : "bg-card border-red-500/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          service.connected
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-display font-semibold text-foreground">
                            {service.name}
                          </h3>
                          {service.connected ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Connected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                              <XCircle className="w-3 h-3" />
                              Disconnected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>

                        {service.error && !service.connected && (
                          <div className="mt-2 text-xs text-red-400/80 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                            {service.error}
                          </div>
                        )}

                        {service.details && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {service.details.models && (
                              <span>
                                Models: {(service.details.models as string[]).join(", ")}
                              </span>
                            )}
                            {service.details.version && (
                              <span>Version: {service.details.version}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestService(service.name)}
                      disabled={isTesting}
                      className="border-white/10 rounded-xl text-xs shrink-0"
                    >
                      {isTesting ? (
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <Wifi className="w-3 h-3 mr-1.5" />
                      )}
                      Test
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}

          <div className="p-5 bg-card/50 border border-white/5 rounded-2xl mt-8">
            <h3 className="font-display font-semibold text-sm mb-3">Pipeline Architecture</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">User Idea</span>
              <span className="text-white/20">→</span>
              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">LM Studio</span>
              <span className="text-white/20">→</span>
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">Storyboard</span>
              <span className="text-white/20">→</span>
              <span className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20">ComfyUI</span>
              <span className="text-white/20">→</span>
              <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">Wan2</span>
              <span className="text-white/20">→</span>
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">Timeline</span>
              <span className="text-white/20">→</span>
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">FFmpeg</span>
              <span className="text-white/20">→</span>
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">Final MP4</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
