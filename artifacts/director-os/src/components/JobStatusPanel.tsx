import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Video,
  Film,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Job {
  id: number;
  projectId: number;
  shotId: number | null;
  jobType: string;
  provider: string | null;
  status: string;
  progress: number | null;
  errorMessage: string | null;
  retryCount: number | null;
  maxRetries: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const JOB_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  render: Film,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  processing: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

export default function JobStatusPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${BASE}/api/generation-jobs?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchJobs();
    intervalRef.current = setInterval(fetchJobs, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const activeJobs = jobs.filter(j => j.status === "pending" || j.status === "processing");
  const recentJobs = jobs.filter(j => j.status === "completed" || j.status === "failed").slice(0, 5);
  const displayJobs = isExpanded ? [...activeJobs, ...recentJobs] : activeJobs;

  const hasActiveJobs = activeJobs.length > 0;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className={`rounded-full shadow-lg ${hasActiveJobs ? "bg-primary animate-pulse" : "bg-card border border-white/10"}`}
          size="sm"
        >
          {hasActiveJobs && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
          AI Jobs {hasActiveJobs ? `(${activeJobs.length})` : ""}
          <ChevronUp className="w-3 h-3 ml-1.5" />
        </Button>
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 right-4 z-50 w-96 bg-card border border-white/10 rounded-t-2xl shadow-2xl overflow-hidden"
    >
      <div
        className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {hasActiveJobs ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-sm font-display font-semibold">
            AI Jobs
          </span>
          {hasActiveJobs && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {activeJobs.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-white/10"
            onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden max-h-80 overflow-y-auto"
          >
            {displayJobs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No jobs yet
              </div>
            ) : (
              displayJobs.map((job) => {
                const Icon = JOB_ICONS[job.jobType] || Film;
                const statusColor = STATUS_COLORS[job.status] || "text-muted-foreground";

                return (
                  <div
                    key={job.id}
                    className="px-4 py-2.5 border-b border-white/5 last:border-0 flex items-center gap-3"
                  >
                    <div className={`${statusColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate capitalize">
                          {job.jobType} Generation
                        </span>
                        {job.shotId && (
                          <span className="text-[10px] text-muted-foreground">
                            Shot {job.shotId}
                          </span>
                        )}
                      </div>
                      {job.errorMessage && job.status === "failed" && (
                        <div className="text-[10px] text-red-400/80 truncate mt-0.5">
                          {job.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {job.status === "processing" && (
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                      )}
                      {job.status === "pending" && (
                        <Clock className="w-3 h-3 text-yellow-400" />
                      )}
                      {job.status === "completed" && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      )}
                      {job.status === "failed" && (
                        <XCircle className="w-3 h-3 text-red-400" />
                      )}
                      <span className={`text-[10px] capitalize font-medium ${statusColor}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
