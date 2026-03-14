import { Scissors, Play, SkipBack, SkipForward, Layers, Type, Wand2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Editor() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Top Half: Preview & Inspector */}
      <div className="flex-1 flex min-h-0 border-b border-border">
        
        {/* Left: Inspector / Media Pool */}
        <div className="w-72 border-r border-border bg-card/50 flex flex-col">
          <div className="p-3 border-b border-border flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 text-xs">Media</Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs bg-secondary">Inspector</Button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="text-center text-muted-foreground text-sm mt-10">Select a clip to inspect properties.</div>
          </div>
        </div>

        {/* Center: Monitor */}
        <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center p-6 relative">
          <div className="w-full max-w-3xl aspect-[16/9] bg-black border border-white/10 rounded-lg shadow-2xl relative overflow-hidden">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Editor Canvas" 
              className="w-full h-full object-cover opacity-80"
            />
            {/* Title Safe Guide */}
            <div className="absolute inset-[10%] border border-white/20 border-dashed pointer-events-none hidden lg:block" />
          </div>
          
          {/* Transport Controls */}
          <div className="mt-6 flex items-center gap-4 bg-card/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/5">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full"><SkipBack className="w-4 h-4" /></Button>
            <Button size="icon" className="bg-primary hover:bg-primary/90 text-white rounded-full w-10 h-10 shadow-glow"><Play className="w-4 h-4 ml-0.5" /></Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full"><SkipForward className="w-4 h-4" /></Button>
            <div className="w-px h-6 bg-border mx-2" />
            <div className="font-mono text-sm text-primary">00:01:24:12</div>
          </div>
        </div>
      </div>

      {/* Bottom Half: Timeline */}
      <div className="h-80 bg-card flex flex-col shrink-0 relative">
        {/* Timeline Toolbar */}
        <div className="h-10 border-b border-border bg-background/80 flex items-center px-4 gap-2">
          <Scissors className="w-4 h-4 text-muted-foreground mr-2" />
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2"><Wand2 className="w-3 h-3 mr-1.5" />Auto-Match</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2"><Layers className="w-3 h-3 mr-1.5" />Transitions</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2"><Type className="w-3 h-3 mr-1.5" />Titles</Button>
          
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
             <span className="text-xs font-bold text-white tracking-widest uppercase border border-white/20 px-4 py-1.5 rounded bg-black/50">Timeline Editor Coming Soon</span>
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-auto relative bg-[#0f0f13]">
          {/* Playhead line */}
          <div className="absolute left-[30%] top-0 bottom-0 w-px bg-primary z-20 pointer-events-none shadow-[0_0_10px_rgba(139,92,246,1)]" />
          <div className="absolute left-[30%] top-0 w-3 h-3 -translate-x-[5px] bg-primary rounded-sm z-20 pointer-events-none" />

          <div className="flex flex-col">
            {/* Video Track 1 */}
            <div className="flex h-16 border-b border-white/5 relative group">
              <div className="w-24 bg-card border-r border-border shrink-0 flex items-center px-2 text-xs text-muted-foreground font-mono border-l-2 border-l-blue-500">V1</div>
              <div className="flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE5IDBMMTkgMjBMMCAyMEwwIDBaIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTE5IDBMMTkgMjAiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')]">
                <div className="absolute left-[10%] top-1 bottom-1 w-[40%] bg-blue-600/30 border border-blue-500/50 rounded flex overflow-hidden">
                  <div className="px-2 py-1 text-[10px] text-blue-200 font-medium truncate">SC1_Shot_1.mp4</div>
                </div>
              </div>
            </div>
            
            {/* Audio Track 1 */}
            <div className="flex h-16 border-b border-white/5 relative group">
              <div className="w-24 bg-card border-r border-border shrink-0 flex items-center px-2 text-xs text-muted-foreground font-mono border-l-2 border-l-emerald-500">A1</div>
              <div className="flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE5IDBMMTkgMjBMMCAyMEwwIDBaIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTE5IDBMMTkgMjAiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')]">
                <div className="absolute left-[10%] top-1 bottom-1 w-[80%] bg-emerald-600/20 border border-emerald-500/40 rounded flex items-center justify-center overflow-hidden">
                   {/* Fake Waveform */}
                   <div className="w-full h-6 opacity-30 flex items-center justify-around px-1 gap-0.5">
                     {[...Array(50)].map((_, i) => (
                       <div key={i} className="w-1 bg-emerald-400 rounded-full" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
