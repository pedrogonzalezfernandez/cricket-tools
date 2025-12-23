import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { NavButton } from "@/components/ui/nav-button";
import { ArrowLeft, Wand2, Users } from "lucide-react";

export default function LivePlay() {
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
              Live Play
            </h1>
            <p className="text-muted-foreground font-light" data-testid="text-subtitle">
              Real-time score transmission
            </p>
          </div>

          <div className="space-y-4">
            <NavButton
              icon={Wand2}
              title="Conductor"
              description="Control the performance"
              onClick={() => setLocation("/LivePlay/Conductor")}
              data-testid="button-conductor"
            />

            <NavButton
              icon={Users}
              title="Player"
              description="Receive your score"
              onClick={() => setLocation("/LivePlay/Player")}
              data-testid="button-player"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
