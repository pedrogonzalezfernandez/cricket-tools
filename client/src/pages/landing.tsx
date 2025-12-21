import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, Users } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-light tracking-tight text-foreground mb-6" data-testid="text-title">
            Audio Score
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-light" data-testid="text-tagline">
            Real-time collaborative music. Control the performance or receive your personalized score.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Card 
            className="card-hover cursor-pointer animate-fade-in stagger-1 opacity-0"
            onClick={() => setLocation("/conductor")}
            data-testid="card-conductor"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-border flex items-center justify-center">
                <Wand2 className="w-7 h-7 text-foreground" />
              </div>
              <CardTitle className="text-xl font-medium tracking-tight">Conductor</CardTitle>
              <CardDescription className="text-muted-foreground font-light">
                Control the performance
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
                Enter
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="card-hover cursor-pointer animate-fade-in stagger-2 opacity-0"
            onClick={() => setLocation("/player")}
            data-testid="card-player"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-border flex items-center justify-center">
                <Users className="w-7 h-7 text-foreground" />
              </div>
              <CardTitle className="text-xl font-medium tracking-tight">Player</CardTitle>
              <CardDescription className="text-muted-foreground font-light">
                Receive your score
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline"
                className="w-full" 
                data-testid="button-enter-player"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/player");
                }}
              >
                Enter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
