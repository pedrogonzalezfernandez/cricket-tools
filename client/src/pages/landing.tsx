import { useLocation } from "wouter";
import { Radio, Music } from "lucide-react";
import cricketToolsLogo from "@assets/CricketTools_1766517253872.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="text-center mb-12">
          <img 
            src={cricketToolsLogo} 
            alt="Cricket Tools" 
            className="mx-auto mb-6 w-80 h-auto dark:invert"
            data-testid="img-logo"
          />
          <p className="text-muted-foreground font-light" data-testid="text-tagline">
            Utilities for online audio scoring on mobile devices
          </p>
        </div>

        <div className="w-full space-y-4">
          <button
            className="group w-full py-5 px-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out hover:bg-foreground hover:text-background hover:border-foreground hover:shadow-lg active:scale-[0.98]"
            onClick={() => setLocation("/LivePlay")}
            data-testid="button-live-play"
          >
            <div className="flex items-center justify-center gap-3 mb-1">
              <Radio className="w-5 h-5" />
              <span className="text-lg font-medium">Live Play</span>
            </div>
            <p className="text-sm opacity-70 font-light">Real-time synth scoring</p>
          </button>

          <button
            className="group w-full py-5 px-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out hover:bg-foreground hover:text-background hover:border-foreground hover:shadow-lg active:scale-[0.98]"
            onClick={() => setLocation("/MP3Sync")}
            data-testid="button-mp3-sync"
          >
            <div className="flex items-center justify-center gap-3 mb-1">
              <Music className="w-5 h-5" />
              <span className="text-lg font-medium">MP3 Sync</span>
            </div>
            <p className="text-sm opacity-70 font-light">Synchronized audio playback</p>
          </button>
        </div>
      </div>
    </div>
  );
}
