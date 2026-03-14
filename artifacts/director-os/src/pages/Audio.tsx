import { AudioWaveform, Wand2, Music, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Audio() {
  return (
    <div className="flex flex-col h-full w-full items-center justify-center bg-background p-8">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center relative overflow-hidden border border-primary/20 shadow-glow">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg">
            <AudioWaveform className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-3xl font-display font-bold text-white mb-3">Audio Studio</h2>
          <p className="text-muted-foreground mb-8">
            AI-generated scores, cinematic sound design, and automated foley synchronization are being wired up.
          </p>
          
          <div className="grid grid-cols-1 gap-3 mb-8">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center text-left text-sm text-white/80">
              <Music className="w-4 h-4 text-primary mr-3 shrink-0" />
              Dynamic Music Generation
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center text-left text-sm text-white/80">
              <Wand2 className="w-4 h-4 text-amber-400 mr-3 shrink-0" />
              Scene-aware Sound Effects
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center text-left text-sm text-white/80">
              <Mic2 className="w-4 h-4 text-emerald-400 mr-3 shrink-0" />
              AI Voiceover & ADR
            </div>
          </div>
          
          <Button disabled className="w-full bg-secondary text-muted-foreground border-white/10 h-12 rounded-xl">
            Module Offline
          </Button>
        </div>
      </div>
    </div>
  );
}
