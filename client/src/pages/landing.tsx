import { useLocation } from "wouter";
import { Radio, Music } from "lucide-react";
import { NavButton } from "@/components/ui/nav-button";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="text-center mb-12">
          <img 
            src="/favicon.png"
            alt="Cricket Tools" 
            className="mx-auto mb-6 w-80 h-auto dark:invert"
            data-testid="img-logo"
          />
          <p className="text-muted-foreground font-light" data-testid="text-tagline">
            Utilities for online audio scoring on mobile devices
          </p>
        </div>

        <div className="w-full space-y-4">
          <NavButton
            icon={Radio}
            title="Live Play"
            description="Real-time audio score creation"
            onClick={() => setLocation("/LivePlay")}
            data-testid="button-live-play"
          />

          <NavButton
            icon={Music}
            title="MP3 Sync"
            description="Synchronized audio score playback"
            onClick={() => setLocation("/MP3Sync")}
            data-testid="button-mp3-sync"
          />
        </div>
      </div>
    </div>
  );
}
