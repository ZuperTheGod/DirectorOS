import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Wifi,
  RefreshCcw,
  Loader2,
  Brain,
  Image as ImageIcon,
  Video,
  Film,
  Server,
  CheckCircle2,
  XCircle,
  Save,
  Pencil,
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
  config: Record<string, any>;
}

interface SettingsData {
  lmstudio: { url: string; model: string };
  comfyui: { url: string };
  wan2gp: { url: string };
  ffmpeg: { path: string };
}

const SERVICE_ICONS: Record<string, typeof Brain> = {
  "LM Studio": Brain,
  ComfyUI: ImageIcon,
  Wan2GP: Video,
  FFmpeg: Film,
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "LM Studio": "Local LLM for AI Director reasoning, scene planning, and prompt optimization",
  ComfyUI: "Image generation workflows using Stable Diffusion and custom pipelines",
  Wan2GP: "Video generation from images using Wan2.1 models via Gradio API",
  FFmpeg: "Timeline rendering and final video export",
};

const SERVICE_CONFIG_KEYS: Record<string, { category: string; fields: { key: string; label: string; placeholder: string }[] }> = {
  "LM Studio": {
    category: "lmstudio",
    fields: [
      { key: "url", label: "Server URL", placeholder: "http://localhost:1234" },
      { key: "model", label: "Model Name", placeholder: "e.g. qwen2.5-7b-instruct" },
    ],
  },
  ComfyUI: {
    category: "comfyui",
    fields: [
      { key: "url", label: "Server URL", placeholder: "http://localhost:8188" },
    ],
  },
  Wan2GP: {
    category: "wan2gp",
    fields: [
      { key: "url", label: "Server URL", placeholder: "http://localhost:7860" },
    ],
  },
  FFmpeg: {
    category: "ffmpeg",
    fields: [
      { key: "path", label: "FFmpeg Path", placeholder: "ffmpeg" },
    ],
  },
};

export default function SettingsPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [editedSettings, setEditedSettings] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingService, setTestingService] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BASE}/api/services/status`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ServicesResponse = await res.json();
      setServices(data.services);
    } catch {
      setServices([]);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BASE}/api/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data: SettingsData = await res.json();
      setSettings(data);
      setEditedSettings({
        lmstudio: { url: data.lmstudio.url, model: data.lmstudio.model },
        comfyui: { url: data.comfyui.url },
        wan2gp: { url: data.wan2gp.url },
        ffmpeg: { path: data.ffmpeg.path },
      });
    } catch {
      setSettings(null);
    }
  };

  useEffect(() => {
    Promise.all([fetchStatus(), fetchSettings()]).finally(() => setIsLoading(false));
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([fetchStatus(), fetchSettings()]).finally(() => setIsRefreshing(false));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedSettings),
      });
      if (!res.ok) throw new Error("Save failed");
      await fetchSettings();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchStatus();
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
    setIsSaving(false);
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

  const updateField = (category: string, key: string, value: string) => {
    setEditedSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const hasChanges = () => {
    if (!settings) return false;
    const s = settings as any;
    for (const [cat, fields] of Object.entries(editedSettings)) {
      for (const [key, val] of Object.entries(fields as Record<string, string>)) {
        if (s[cat]?.[key] !== val) return true;
      }
    }
    return false;
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
        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="border-white/10 rounded-xl"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
            className={`rounded-xl transition-all ${
              saveSuccess
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saveSuccess ? "Saved" : "Save Settings"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              Checking service connections...
            </div>
          ) : (
            services.map((service, idx) => {
              const Icon = SERVICE_ICONS[service.name] || Server;
              const description = SERVICE_DESCRIPTIONS[service.name] || "";
              const configDef = SERVICE_CONFIG_KEYS[service.name];
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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
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
                              <span>Models: {(service.details.models as string[]).join(", ")}</span>
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

                  {configDef && editedSettings[configDef.category] && (
                    <div className="border-t border-white/5 pt-4 mt-4">
                      <div className="grid gap-3">
                        {configDef.fields.map((field) => (
                          <div key={field.key} className="flex flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                              {field.label}
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={editedSettings[configDef.category]?.[field.key] || ""}
                                onChange={(e) =>
                                  updateField(configDef.category, field.key, e.target.value)
                                }
                                placeholder={field.placeholder}
                                className="w-full bg-background text-sm text-foreground px-3 py-2.5 rounded-xl border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/40"
                              />
                              <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}

          <div className="p-5 bg-card/50 border border-white/5 rounded-2xl mt-8">
            <h3 className="font-display font-semibold text-sm mb-3">Pipeline Architecture</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">User Idea</span>
              <span className="text-white/20">&rarr;</span>
              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">LM Studio</span>
              <span className="text-white/20">&rarr;</span>
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">Storyboard</span>
              <span className="text-white/20">&rarr;</span>
              <span className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20">ComfyUI</span>
              <span className="text-white/20">&rarr;</span>
              <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">Wan2GP</span>
              <span className="text-white/20">&rarr;</span>
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">Timeline</span>
              <span className="text-white/20">&rarr;</span>
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">FFmpeg</span>
              <span className="text-white/20">&rarr;</span>
              <span className="bg-background px-3 py-1.5 rounded-lg border border-white/5">Final MP4</span>
            </div>
          </div>

          <div className="p-5 bg-card/50 border border-white/5 rounded-2xl">
            <h3 className="font-display font-semibold text-sm mb-3">Setup Guide</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">1</span>
                <div>
                  <span className="text-foreground font-medium">LM Studio</span> &mdash; Download from lmstudio.ai, load a model, and start the local server on port 1234.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
                <div>
                  <span className="text-foreground font-medium">ComfyUI</span> &mdash; Install ComfyUI with an SDXL checkpoint for image generation on port 8188.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-xs flex items-center justify-center font-bold">3</span>
                <div>
                  <span className="text-foreground font-medium">Wan2GP</span> &mdash; Clone from github.com/deepbeepmeep/Wan2GP, install dependencies, and run on port 7860. Supports image-to-video generation using Wan2.1 models.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-center font-bold">4</span>
                <div>
                  <span className="text-foreground font-medium">FFmpeg</span> &mdash; Install system-wide for timeline rendering and video export. Usually pre-installed on Linux.
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
