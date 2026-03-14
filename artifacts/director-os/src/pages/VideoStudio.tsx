import { Play, Settings2, Video, FastForward, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function VideoStudio() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Settings Panel */}
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0 z-10 shadow-2xl shadow-black/50">
        <div className="p-4 border-b border-border flex items-center gap-2 bg-background/50">
          <Settings2 className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold">Motion Controls</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Camera Motion</Label>
            <Select defaultValue="pan-right">
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
                <span className="text-xs text-foreground font-mono">128</span>
              </div>
              <Slider defaultValue={[128]} max={255} className="py-2" />
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-4 h-4 text-amber-400" />
              <Label className="text-xs uppercase tracking-wider text-amber-400 font-semibold">VFX Layer System</Label>
            </div>
            
            <Select defaultValue="none">
              <SelectTrigger className="bg-background border-white/10 rounded-xl h-11">
                <SelectValue placeholder="Add VFX Overlay..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Effects</SelectItem>
                <SelectItem value="fire">Cinematic Fire/Embers</SelectItem>
                <SelectItem value="rain">Heavy Rain + Distortion</SelectItem>
                <SelectItem value="lightning">Lightning Flashes</SelectItem>
                <SelectItem value="smoke">Atmospheric Smoke</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">AI will auto-composite effects matching depth and scene lighting.</p>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-background/50">
          <Button className="w-full bg-gradient-to-r from-primary to-blue-600 text-white shadow-glow rounded-xl h-12 relative overflow-hidden group">
            <Video className="w-4 h-4 mr-2 relative z-10" />
            <span className="relative z-10 font-semibold tracking-wide">Generate Video Clip</span>
            
            {/* Mock overlay */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
              <span className="text-xs font-bold text-white tracking-widest uppercase">Coming Soon</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 flex flex-col bg-[#050505] relative">
        <div className="flex-1 p-8 flex flex-col items-center justify-center relative">
          {/* Main Video Monitor */}
          <div className="w-full max-w-4xl aspect-[16/9] bg-background border border-white/10 rounded-xl overflow-hidden shadow-2xl relative group">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Source Frame" 
              className="w-full h-full object-cover"
            />
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 cursor-pointer hover:scale-110 transition-transform hover:bg-white/20">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
            
            {/* Playback bar */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end px-4 pb-3">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                <div className="w-1/3 h-full bg-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Strip */}
        <div className="h-48 border-t border-border bg-card/50 backdrop-blur-xl p-4 flex gap-4 overflow-x-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest absolute -top-3 left-4 bg-background px-2">Generated Candidates</div>
          {[1,2,3,4].map(i => (
            <div key={i} className={`w-64 h-full bg-secondary rounded-lg border ${i === 1 ? 'border-primary ring-1 ring-primary/50' : 'border-white/5'} overflow-hidden relative group cursor-pointer`}>
              <img 
                src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
                alt={`Candidate ${i}`} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ filter: `hue-rotate(${i * 30}deg)` }}
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono text-white/90 border border-white/10">
                Seed: 8493{i}2
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
