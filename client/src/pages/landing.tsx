import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-title">
            Audio Score
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto" data-testid="text-tagline">
            A real-time collaborative music experience. Join as a conductor to control the performance, or as a player to receive your personalized score.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Card 
            className="hover-elevate active-elevate-2 cursor-pointer transition-transform"
            onClick={() => setLocation("/conductor")}
            data-testid="card-conductor"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                <Music className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold">Conductor</CardTitle>
              <CardDescription className="text-muted-foreground">
                Control the performance in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                className="w-full" 
                data-testid="button-enter-conductor"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/conductor");
                }}
              >
                Enter as Conductor
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover-elevate active-elevate-2 cursor-pointer transition-transform"
            onClick={() => setLocation("/player")}
            data-testid="card-player"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-accent">
                <Users className="w-10 h-10 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl font-semibold">Player</CardTitle>
              <CardDescription className="text-muted-foreground">
                Receive your personalized audio score
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="secondary"
                className="w-full" 
                data-testid="button-enter-player"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/player");
                }}
              >
                Enter as Player
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
