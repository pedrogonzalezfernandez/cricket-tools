import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocket, useConductorSocket } from "@/hooks/use-socket";
import { midiToNoteName } from "@shared/schema";
import { ArrowLeft, Users, Music } from "lucide-react";

export default function Conductor() {
  const [, setLocation] = useLocation();
  const { socket, isConnected } = useSocket();
  const { players, currentScene, joinAsConductor, setPlayerPitch, setPlayerInterval, setScene, isJoined } = useConductorSocket(socket);

  useEffect(() => {
    if (socket && isConnected && !isJoined) {
      joinAsConductor();
    }
  }, [socket, isConnected, isJoined, joinAsConductor]);

  const playerList = Object.values(players);
  const playerCount = playerList.length;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted animate-pulse" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold" data-testid="text-conductor-title">
                Conductor Dashboard
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={currentScene} onValueChange={setScene}>
              <SelectTrigger className="w-40" data-testid="select-scene">
                <SelectValue placeholder="Select scene" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audioScore">Audio Score</SelectItem>
              </SelectContent>
            </Select>
            
            <Badge variant="secondary" className="gap-1" data-testid="badge-player-count">
              <Users className="w-3 h-3" />
              {playerCount} {playerCount === 1 ? "Player" : "Players"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {playerCount === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-6 text-muted-foreground/50" />
            <h2 className="text-xl font-medium text-foreground mb-2" data-testid="text-no-players-title">
              No Players Connected
            </h2>
            <p className="text-muted-foreground" data-testid="text-no-players-message">
              Players will appear here when they join the performance
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playerList.map((player) => (
              <Card key={player.socketId} data-testid={`card-player-${player.socketId}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-medium truncate" data-testid={`text-player-name-${player.socketId}`}>
                      {player.name}
                    </CardTitle>
                    <code className="text-xs text-muted-foreground font-mono truncate max-w-24" data-testid={`text-player-id-${player.socketId}`}>
                      {player.socketId.slice(0, 8)}
                    </code>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Pitch
                      </label>
                      <span className="text-sm font-mono text-muted-foreground" data-testid={`text-pitch-value-${player.socketId}`}>
                        {midiToNoteName(player.pitch)} ({player.pitch})
                      </span>
                    </div>
                    <Slider
                      value={[player.pitch]}
                      min={36}
                      max={84}
                      step={1}
                      onValueChange={(value) => setPlayerPitch(player.socketId, value[0])}
                      data-testid={`slider-pitch-${player.socketId}`}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Interval
                      </label>
                      <span className="text-sm font-mono text-muted-foreground" data-testid={`text-interval-value-${player.socketId}`}>
                        {player.interval} ms
                      </span>
                    </div>
                    <Slider
                      value={[player.interval]}
                      min={50}
                      max={3000}
                      step={50}
                      onValueChange={(value) => setPlayerInterval(player.socketId, value[0])}
                      data-testid={`slider-interval-${player.socketId}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
