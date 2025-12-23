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
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-light tracking-tight text-foreground mb-3" data-testid="text-title">
              MP3 Sync
            </h1>
            <p className="text-muted-foreground font-light" data-testid="text-subtitle">
              Synchronized audio playback
            </p>
          </div>

          <div className="space-y-4">
            <button
              className="group w-full py-5 px-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out hover:bg-foreground hover:text-background hover:border-foreground hover:shadow-lg active:scale-[0.98]"
              onClick={() => setLocation("/MP3Sync/Conductor")}
              data-testid="button-conductor"
            >
              <div className="flex items-center justify-center gap-3 mb-1">
                <Music className="w-5 h-5" />
                <span className="text-lg font-medium">Conductor</span>
              </div>
              <p className="text-sm opacity-70 font-light">Manage audio files</p>
            </button>

            <button
              className="group w-full py-5 px-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out hover:bg-foreground hover:text-background hover:border-foreground hover:shadow-lg active:scale-[0.98]"
              onClick={() => setLocation("/MP3Sync/Player")}
              data-testid="button-player"
            >
              <div className="flex items-center justify-center gap-3 mb-1">
                <Headphones className="w-5 h-5" />
                <span className="text-lg font-medium">Player</span>
              </div>
              <p className="text-sm opacity-70 font-light">Listen in sync</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
