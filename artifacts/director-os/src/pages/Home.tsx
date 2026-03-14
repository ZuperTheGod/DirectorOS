import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Film, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListProjects, 
  useCreateProject,
  getListProjectsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Home() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListProjects();
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    aspectRatio: "16:9",
    targetDuration: 60
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProject(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setIsDialogOpen(false);
          setFormData({ name: "", description: "", aspectRatio: "16:9", targetDuration: 60 });
        }
      }
    );
  };

  return (
    <div className="w-full h-full p-8 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <h2 className="text-4xl font-display font-bold text-foreground">Your Studio</h2>
          <p className="text-muted-foreground mt-2 text-lg">Manage your cinematic projects and generative workspaces.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow h-12 px-6 rounded-xl font-semibold">
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-white/10 text-foreground rounded-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Create New Project</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Initialize a new AI-directed filmmaking workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid gap-3">
                  <Label htmlFor="name" className="text-sm font-medium">Project Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="bg-background border-border h-12 rounded-xl focus-visible:ring-primary" 
                    placeholder="e.g. Neo-Tokyo Heist"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="description" className="text-sm font-medium">Concept / Logline</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="bg-background border-border min-h-[100px] rounded-xl focus-visible:ring-primary" 
                    placeholder="A cyberpunk thriller about a rogue AI..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="aspect">Aspect Ratio</Label>
                    <Select value={formData.aspectRatio} onValueChange={(v) => setFormData(p => ({ ...p, aspectRatio: v }))}>
                      <SelectTrigger className="bg-background border-border h-12 rounded-xl">
                        <SelectValue placeholder="Select ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Standard)</SelectItem>
                        <SelectItem value="2.35:1">2.35:1 (Cinematic)</SelectItem>
                        <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="duration">Target Duration (sec)</Label>
                    <Input 
                      id="duration" 
                      type="number"
                      value={formData.targetDuration}
                      onChange={(e) => setFormData(p => ({ ...p, targetDuration: parseInt(e.target.value) || 0 }))}
                      className="bg-background border-border h-12 rounded-xl focus-visible:ring-primary" 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating || !formData.name} className="bg-primary hover:bg-primary/90 rounded-xl h-11 px-8">
                  {isCreating ? "Initializing..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-card animate-pulse border border-white/5"></div>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl"
        >
          <img 
            src={`${import.meta.env.BASE_URL}images/empty-film.png`} 
            alt="Empty film reel" 
            className="w-64 h-64 object-cover rounded-2xl mb-8 opacity-80 mix-blend-screen"
          />
          <h3 className="text-2xl font-display font-bold mb-2">No projects yet</h3>
          <p className="text-muted-foreground max-w-md">Start your first AI-directed film by creating a new project workspace.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects?.map((project, idx) => (
            <Link key={project.id} href={`/projects/${project.id}/director`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative flex flex-col h-72 bg-card rounded-3xl border border-white/5 overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-glow cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                
                {/* Project Cover Placeholder - fallback to abstract gradient if no thumbnail */}
                <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-105 transform">
                  <img 
                    src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="relative z-20 flex flex-col h-full p-6 justify-between">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-medium border border-white/10 capitalize">
                      {project.status}
                    </span>
                    <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-medium border border-white/10 flex items-center gap-1.5">
                      <Film className="w-3 h-3" />
                      {project.aspectRatio || "16:9"}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-display font-bold text-white mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                    <p className="text-white/70 text-sm line-clamp-2 mb-4 leading-relaxed">
                      {project.description || "No concept description provided."}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(project.updatedAt), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {project.targetDuration ? `${project.targetDuration}s` : "TBD"}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
