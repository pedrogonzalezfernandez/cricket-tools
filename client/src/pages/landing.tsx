import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import cricketToolsLogo from "@assets/CricketTools_1766517253872.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img 
            src={cricketToolsLogo} 
            alt="Cricket Tools" 
            className="mx-auto mb-6 w-48 h-auto dark:invert"
            data-testid="img-logo"
          />
          <h1 className="text-3xl font-light tracking-tight text-foreground mb-3" data-testid="text-title">
            Cricket Tools
          </h1>
          <p className="text-muted-foreground font-light" data-testid="text-tagline">
            Utilities for online audio scoring on mobile devices
          </p>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full py-6 text-lg"
            onClick={() => setLocation("/LivePlay")}
            data-testid="button-live-play"
          >
            Live Play
          </Button>

          <Button
            variant="outline"
            className="w-full py-6 text-lg"
            onClick={() => setLocation("/MP3Sync")}
            data-testid="button-mp3-sync"
          >
            MP3 Sync
          </Button>
        </div>
      </div>
    </div>
  );
}
