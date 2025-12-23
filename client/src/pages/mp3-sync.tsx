import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Headphones } from "lucide-react";

export default function Mp3Sync() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-light tracking-tight text-foreground mb-3" data-testid="text-title">
              MP3 Sync
            </h1>
            <p className="text-muted-foreground font-light" data-testid="text-subtitle">
              Synchronized audio playback.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              className="w-full py-6 flex flex-col items-center gap-1"
              onClick={() => setLocation("/MP3Sync/Conductor")}
              data-testid="button-conductor"
            >
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                <span className="text-lg font-medium">Conductor</span>
              </div>
              <span className="text-sm opacity-80 font-light">Control the session.</span>
            </Button>

            <Button
              variant="outline"
              className="w-full py-6 flex flex-col items-center gap-1"
              onClick={() => setLocation("/MP3Sync/Player")}
              data-testid="button-player"
            >
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5" />
                <span className="text-lg font-medium">Player</span>
              </div>
              <span className="text-sm opacity-80 font-light">Follow the score.</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
