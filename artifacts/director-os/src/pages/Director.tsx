import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  Film,
  Sparkles,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Palette,
  Camera,
  Music,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";
import {
  useGenerateStoryboard,
  useGetProject,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

interface StructuredIntent {
  projectGoal?: string;
  mood?: string;
  genre?: string;
  pacing?: string;
  visualStyle?: string;
  colorPalette?: string;
  lighting?: string;
  cameraLanguage?: string;
}

interface Suggestion {
  type: string;
  label: string;
  description: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  structuredIntent?: StructuredIntent | null;
  suggestions?: Suggestion[];
  reasoning?: string | null;
  isStreaming?: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function streamDirectorChat(
  projectId: number,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: (parsed: any) => void,
  onError: (error: string) => void
) {
  const response = await fetch(
    `${BASE}/api/projects/${projectId}/director/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationHistory }),
    }
  );

  if (!response.ok) {
    onError("Failed to connect to AI Director");
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("No response stream");
    return;
  }

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
          if (data.error) {
            onError(data.error);
            return;
          }
          if (data.done && data.parsed) {
            onDone(data.parsed);
          } else if (data.content) {
            onChunk(data.content);
          }
        } catch {}
      }
    }
  }
}

const INTENT_LABELS: Record<string, { icon: any; label: string }> = {
  projectGoal: { icon: Lightbulb, label: "Vision" },
  mood: { icon: Palette, label: "Mood" },
  genre: { icon: Film, label: "Genre" },
  pacing: { icon: Music, label: "Pacing" },
  visualStyle: { icon: Eye, label: "Visual Style" },
  colorPalette: { icon: Palette, label: "Colors" },
  lighting: { icon: Lightbulb, label: "Lighting" },
  cameraLanguage: { icon: Camera, label: "Camera" },
};

export default function Director() {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const queryClient = useQueryClient();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId },
  });
  const { mutate: generateStoryboard, isPending: isGenerating } =
    useGenerateStoryboard();

  const [input, setInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<number | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to the Director's chair. I'm your AI collaborator. Tell me about the concept for this film, the mood you're going for, or a specific scene you want to build.",
      suggestions: [
        {
          type: "set_style",
          label: "Set Visual Style",
          description:
            "I want to establish the overall look and feel of my film",
        },
        {
          type: "refine_concept",
          label: "Describe My Concept",
          description:
            "I have an idea for a film and want to develop it further",
        },
        {
          type: "generate_storyboard",
          label: "Quick Storyboard",
          description:
            "Generate a storyboard from the project description right away",
        },
      ],
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent, overrideMsg?: string) => {
      e?.preventDefault();
      const msg = overrideMsg || input;
      if (!msg.trim() || isChatting) return;

      const userMsg: Message = { role: "user", content: msg };
      setMessages((prev) => [
        ...prev,
        userMsg,
        { role: "assistant", content: "", isStreaming: true },
      ]);
      setInput("");
      setIsChatting(true);

      const history = messages
        .filter((m) => !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));

      streamDirectorChat(
        projectId,
        msg,
        history,
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: updated[lastIdx].content + chunk,
            };
            return updated;
          });
        },
        (parsed) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = {
              role: "assistant",
              content: parsed.message || updated[lastIdx].content,
              structuredIntent: parsed.structuredIntent,
              suggestions: parsed.suggestions,
              reasoning: parsed.reasoning,
              isStreaming: false,
            };
            return updated;
          });
          setIsChatting(false);
        },
        (error) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = {
              role: "assistant",
              content:
                updated[lastIdx].content ||
                `I encountered an issue: ${error}. Let's try again.`,
              isStreaming: false,
            };
            return updated;
          });
          setIsChatting(false);
        }
      );
    },
    [input, isChatting, messages, projectId]
  );

  const handleGenerateStoryboard = () => {
    const concept =
      project?.description ||
      messages.find((m) => m.role === "user")?.content ||
      "A cinematic sequence";

    generateStoryboard(
      {
        projectId,
        data: {
          concept,
          targetDurationSeconds: project?.targetDuration || 60,
        },
      },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({
            queryKey: [`/api/projects/${projectId}`],
          });
          const sceneCount = res.scenes?.length || 0;
          const shotCount =
            res.scenes?.reduce(
              (sum: number, s: any) => sum + (s.shots?.length || 0),
              0
            ) || 0;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `${res.directorNotes || `I've generated ${sceneCount} scenes with ${shotCount} shots.`}\n\nHead over to the Storyboard tab to review and refine the visual plan.`,
              suggestions: [
                {
                  type: "view_storyboard",
                  label: "View Storyboard",
                  description: "Open the storyboard timeline to see your shots",
                },
              ],
            },
          ]);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "I had trouble generating the storyboard. Let's try refining the concept first, then we can try again.",
            },
          ]);
        },
      }
    );
  };

  const latestIntent = messages
    .slice()
    .reverse()
    .find((m) => m.structuredIntent)?.structuredIntent;

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === "generate_storyboard") {
      handleGenerateStoryboard();
    } else if (suggestion.type === "view_storyboard") {
      window.location.href = `${BASE}/projects/${projectId}/storyboard`;
    } else {
      handleSubmit(undefined, suggestion.description);
    }
  };

  const logUserAction = async (
    action: string,
    entityType: string,
    entityId: number
  ) => {
    try {
      await fetch(`${BASE}/api/projects/${projectId}/director/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `[ACTION: ${action}]`,
          conversationHistory: [],
        }),
      });
    } catch {}
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-background">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-6 pb-8">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center shrink-0">
                      {msg.isStreaming ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : (
                        <Brain className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  )}

                  <div
                    className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`p-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-white/5 text-foreground rounded-tl-sm shadow-lg shadow-black/20"
                      }`}
                    >
                      {msg.isStreaming && !msg.content ? (
                        <div className="flex gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>

                    {msg.reasoning && (
                      <button
                        onClick={() =>
                          setExpandedReasoning(
                            expandedReasoning === i ? null : i
                          )
                        }
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors pl-1"
                      >
                        <Lightbulb className="w-3 h-3" />
                        Why this direction?
                        {expandedReasoning === i ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}

                    <AnimatePresence>
                      {expandedReasoning === i && msg.reasoning && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm text-muted-foreground leading-relaxed">
                            <span className="text-primary font-medium">
                              Creative reasoning:
                            </span>{" "}
                            {msg.reasoning}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(s)}
                            className="text-xs bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 text-secondary-foreground"
                          >
                            <Sparkles className="w-3 h-3 text-primary" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-card/30 backdrop-blur-md">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto relative flex items-center"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe a scene, request a style change, or brainstorm..."
              className="h-14 bg-background border-border rounded-2xl pl-6 pr-14 text-base focus-visible:ring-primary/50 shadow-inner"
              disabled={isChatting}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isChatting}
              className="absolute right-2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="w-96 flex flex-col bg-card border-l border-border hidden lg:flex">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-background/50">
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">
            Creative Intent
          </h3>
        </div>

        <ScrollArea className="flex-1 p-6">
          {latestIntent ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {Object.entries(latestIntent).map(([key, value]) => {
                if (!value) return null;
                const meta = INTENT_LABELS[key];
                if (!meta) return null;
                const IconComp = meta.icon;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <IconComp className="w-3.5 h-3.5 text-primary/70" />
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        {meta.label}
                      </h4>
                    </div>
                    <div className="p-3 bg-background rounded-xl border border-white/5 text-sm text-foreground/90 leading-relaxed">
                      {String(value)}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <Sparkles className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-sm">
                As we chat, I'll extract structured creative intent here to
                guide the generation models.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="p-6 border-t border-border bg-background/50 space-y-3">
          <Button
            onClick={handleGenerateStoryboard}
            disabled={isGenerating}
            className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-xl shadow-glow font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Film className="w-5 h-5" />
            )}
            {isGenerating ? "Drafting Storyboard..." : "Generate Storyboard"}
          </Button>
          {project?.scenes && project.scenes.length > 0 && (
            <div className="text-center">
              <Link
                href={`/projects/${projectId}/storyboard`}
                className="text-sm text-primary hover:underline font-medium"
              >
                View current storyboard ({project.scenes.length} scenes)
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
