import { useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Plus, Video, Image as ImageIcon, Camera, Clock, CheckCircle2, LayoutTemplate } from "lucide-react";
import { 
  useGetProject,
  useCreateScene,
  useCreateShot,
  Shot
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function Storyboard() {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const queryClient = useQueryClient();
  
  const { data: project, isLoading } = useGetProject(projectId, { query: { enabled: !!projectId } });
  const { mutate: createScene, isPending: isCreatingScene } = useCreateScene();
  const { mutate: createShot } = useCreateShot();

  const handleAddScene = () => {
    const nextOrder = project?.scenes?.length || 0;
    createScene(
      { projectId, data: { name: `Scene ${nextOrder + 1}`, orderIndex: nextOrder } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] }) }
    );
  };

  const handleAddShot = (sceneId: number, currentShotCount: number) => {
    createShot(
      { sceneId, data: { orderIndex: currentShotCount, shotType: "medium" } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] }) }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'has_video': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'has_frame': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-secondary text-muted-foreground border-white/10';
    }
  };

  if (isLoading) return <div className="p-8 text-muted-foreground flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-primary/60 animate-pulse" /> Loading timeline...</div>;

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-card/30 shrink-0">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Storyboard Timeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Previsualize scenes and shots before generating video.</p>
        </div>
        <Button onClick={handleAddScene} disabled={isCreatingScene} className="bg-secondary hover:bg-secondary/80 text-foreground border border-white/5 rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Add Scene
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-8 flex flex-col gap-12">
        {project?.scenes?.length === 0 ? (
          <div className="m-auto text-center max-w-sm">
            <LayoutTemplate className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-display font-semibold mb-2">No scenes yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">Ask the AI Director to generate a storyboard or add your first scene manually.</p>
            <Button onClick={handleAddScene} className="bg-primary text-white rounded-xl shadow-glow">
              Create First Scene
            </Button>
          </div>
        ) : (
          project?.scenes?.map((scene, sIdx) => (
            <div key={scene.id} className="flex flex-col gap-4">
              {/* Scene Header */}
              <div className="flex items-center gap-4 sticky left-0 w-max">
                <div className="flex flex-col">
                  <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                    <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">SC {sIdx + 1}</span>
                    {scene.name}
                  </h3>
                  {scene.summary && <p className="text-sm text-muted-foreground max-w-xl truncate mt-1">{scene.summary}</p>}
                </div>
              </div>

              {/* Shots Lane */}
              <div className="flex items-stretch gap-4 pb-4 min-w-max">
                {scene.shots?.map((shot: Shot, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    key={shot.id} 
                    className="w-72 flex-shrink-0 bg-card border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:border-primary/50 transition-colors group"
                  >
                    {/* Thumbnail Area */}
                    <div className="h-40 bg-background relative border-b border-border flex items-center justify-center overflow-hidden">
                      {shot.thumbnailUrl ? (
                        <img src={shot.thumbnailUrl} alt="Shot" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 bg-gradient-to-br from-white/5 to-transparent">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-xs font-medium uppercase tracking-widest">Empty Frame</span>
                        </div>
                      )}
                      
                      {/* Shot Info Overlays */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${getStatusColor(shot.status)}`}>
                          {shot.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 text-xs font-mono text-white/90">
                        <Clock className="w-3 h-3" />
                        {(shot.durationMs || 3000) / 1000}s
                      </div>

                      {/* Quick Actions Hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                        <Button size="icon" variant="secondary" className="w-10 h-10 rounded-full bg-white text-black hover:bg-white/90 hover:scale-110 transition-transform">
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="w-10 h-10 rounded-full bg-primary text-white hover:bg-primary/90 shadow-glow hover:scale-110 transition-transform">
                          <Video className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Meta Data */}
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-foreground font-semibold font-mono text-sm">
                          <span className="text-muted-foreground/50">SH</span> {sIdx + 1}.{idx + 1}
                        </div>
                        {shot.shotType && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md border border-white/5">
                            <Camera className="w-3 h-3" />
                            <span className="capitalize">{shot.shotType.replace('_', ' ')}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {shot.promptSummary || "No prompt generated yet. Open in Image Studio to draft."}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Add Shot Button */}
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
    </div>
  );
}
