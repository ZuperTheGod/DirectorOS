import { useState } from "react";
import { SlidersHorizontal, Image as ImageIcon, Sparkles, RefreshCcw, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

export default function ImageStudio() {
  const [prompt, setPrompt] = useState("Cinematic establishing shot of a futuristic neon city in the rain, deep cyberpunk blues and purples, volumetric lighting, highly detailed, 8k resolution, photorealistic.");

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Left Panel: Prompt Builder */}
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-2 bg-background/50">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold">Generation Settings</h3>
        </div>
        
        <ScrollArea className="flex-1 p-5">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Master Prompt</Label>
              <Textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="h-32 bg-background border-white/10 resize-none text-sm leading-relaxed rounded-xl focus-visible:ring-primary/50" 
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Negative Prompt</Label>
              <Textarea 
                placeholder="ugly, blurry, bad anatomy, cartoon..."
                className="h-16 bg-background border-white/10 resize-none text-sm rounded-xl focus-visible:ring-primary/50" 
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Guidance Scale</Label>
                  <span className="text-xs text-foreground font-mono">7.5</span>
                </div>
                <Slider defaultValue={[7.5]} max={20} step={0.1} className="py-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Steps</Label>
                  <span className="text-xs text-foreground font-mono">40</span>
                </div>
                <Slider defaultValue={[40]} max={100} step={1} className="py-2" />
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-border bg-background/50">
          <Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-glow rounded-xl h-12 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <Sparkles className="w-4 h-4 mr-2 relative z-10" />
            <span className="relative z-10 font-semibold tracking-wide">Generate Frame</span>
            
            {/* Mock overlay as requested */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
              <span className="text-xs font-bold text-white tracking-widest uppercase">Coming Soon</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
        {/* Toolbar overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-xl border border-white/10 px-2 py-1 rounded-full flex gap-1 z-10">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-white"><Maximize className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-white"><RefreshCcw className="w-4 h-4" /></Button>
        </div>
        
        <div className="flex-1 p-8 flex items-center justify-center relative">
          <div className="w-full max-w-4xl aspect-[16/9] border border-white/5 rounded-md shadow-2xl relative bg-background overflow-hidden flex items-center justify-center">
            {/* Mock generated image */}
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Canvas" 
              className="w-full h-full object-cover"
            />
            
            {/* Scanner line effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent h-20 -translate-y-full animate-[scan_3s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      {/* Right Panel: Variants & Evaluation */}
      <div className="w-72 border-l border-border bg-card flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border bg-background/50">
          <h3 className="font-display font-semibold">AI Evaluation</h3>
        </div>
        <div className="p-5 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Score</span>
            <span className="text-lg font-mono font-bold text-primary text-glow">84</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Prompt Match</span>
              <span className="text-emerald-400">92</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Composition</span>
              <span className="text-amber-400">76</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Style Coherence</span>
              <span className="text-emerald-400">85</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-background/50">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">Variants History</h3>
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-[16/9] bg-secondary rounded-md border border-white/5 overflow-hidden relative cursor-pointer hover:border-primary transition-colors group">
                <img 
                  src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
                  alt={`Variant ${i}`} 
                  className={`w-full h-full object-cover opacity-${i===1 ? '100' : '40'} group-hover:opacity-80 transition-opacity`}
                  style={{ filter: `hue-rotate(${i * 45}deg)` }}
                />
                {i === 1 && <div className="absolute inset-0 ring-2 ring-inset ring-primary rounded-md" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
