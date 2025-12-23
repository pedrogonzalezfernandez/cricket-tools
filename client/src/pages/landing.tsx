import { useLocation } from "wouter";
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
            className="mx-auto mb-8 w-72 h-auto dark:invert"
            data-testid="img-logo"
          />
          <p className="text-muted-foreground font-light text-lg" data-testid="text-tagline">
            Utilities for online audio scoring on mobile devices
          </p>
        </div>

        <div className="w-full space-y-4">
          <button
            className="w-full py-4 px-6 text-lg font-medium rounded-xl bg-gradient-to-b from-foreground/90 to-foreground text-background shadow-lg transition-all duration-200 ease-out active:scale-[0.98] active:shadow-md hover:from-foreground hover:to-foreground/90"
            onClick={() => setLocation("/LivePlay")}
            data-testid="button-live-play"
          >
            Live Play
          </button>

          <button
            className="w-full py-4 px-6 text-lg font-medium rounded-xl bg-gradient-to-b from-foreground/90 to-foreground text-background shadow-lg transition-all duration-200 ease-out active:scale-[0.98] active:shadow-md hover:from-foreground hover:to-foreground/90"
            onClick={() => setLocation("/MP3Sync")}
            data-testid="button-mp3-sync"
          >
            MP3 Sync
          </button>
        </div>
      </div>
    </div>
  );
}
