import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSocket, usePlayerSocket } from "@/hooks/use-socket";
import { midiToNoteName } from "@shared/schema";
import { ArrowLeft, Volume2 } from "lucide-react";
import * as Tone from "tone";

export default function Player() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioSuspended, setAudioSuspended] = useState(false);
  const { socket, isConnected, getServerTime } = useSocket();
  const { conductorPresent, playerUpdate, joinAsPlayer, isJoined } = usePlayerSocket(socket);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const synthRef = useRef<Tone.Synth | null>(null);
  const lastCycleRef = useRef<number>(-1);
  const lastPhaseStartRef = useRef<number>(0);
  const pulseRef = useRef<number>(0);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && socket) {
      joinAsPlayer(name.trim());
      setHasJoined(true);
    }
  };

  const startAudio = async () => {
    await Tone.start();
    synthRef.current = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 0.15,
      },
    }).toDestination();
    setAudioStarted(true);
    setAudioSuspended(false);
  };

  const resumeAudio = async () => {
    if (Tone.getContext().state === "suspended") {
      await Tone.start();
    }
    setAudioSuspended(false);
  };

  // Handle visibility change to detect when user returns to the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && audioStarted) {
        // Check if audio context is suspended
        if (Tone.getContext().state === "suspended") {
          setAudioSuspended(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [audioStarted]);

  // Periodically check audio context state
  useEffect(() => {
    if (!audioStarted) return;
    
    const checkAudioState = () => {
      if (Tone.getContext().state === "suspended") {
        setAudioSuspended(true);
      } else {
        setAudioSuspended(false);
      }
    };
    
    const interval = setInterval(checkAudioState, 1000);
    return () => clearInterval(interval);
  }, [audioStarted]);

  const playNote = useCallback((midiNote: number, duration: number) => {
    if (!synthRef.current) return;
    if (Tone.getContext().state !== "running") return;
    const freq = Tone.Frequency(midiNote, "midi").toFrequency();
    synthRef.current.triggerAttackRelease(freq, duration);
    pulseRef.current = 1;
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !playerUpdate || !conductorPresent || !audioStarted || audioSuspended) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const rootStyles = getComputedStyle(document.documentElement);
    
    const getColor = (varName: string, fallback: string): string => {
      const val = rootStyles.getPropertyValue(varName).trim();
      if (val.includes("%")) {
        return `hsl(${val})`;
      }
      return fallback;
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35;

      const serverTime = getServerTime();
      const phaseStart = playerUpdate.phaseStartServerTime;
      const interval = playerUpdate.interval;
      const elapsed = serverTime - phaseStart;
      const currentCycle = Math.floor(elapsed / interval);
      const cycleProgress = ((elapsed % interval) + interval) % interval / interval;
      const angle = cycleProgress * Math.PI * 2 - Math.PI / 2;

      // Reset cycle tracking when phase timing changes or cycle regresses
      if (phaseStart !== lastPhaseStartRef.current || currentCycle < lastCycleRef.current) {
        lastCycleRef.current = currentCycle - 1;
        lastPhaseStartRef.current = phaseStart;
      }

      if (currentCycle > lastCycleRef.current) {
        const duration = Math.min(interval * 0.8, 300) / 1000;
        playNote(playerUpdate.pitch, duration);
        lastCycleRef.current = currentCycle;
      }

      pulseRef.current *= 0.9;

      const bgColor = getColor("--background", "#ffffff");
      const borderColor = getColor("--border", "#e5e5e5");
      const primaryColor = getColor("--primary", "#2563eb");
      const fgColor = getColor("--foreground", "#171717");

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      const triggerX = centerX;
      const triggerY = centerY - radius;
      const baseTriggerSize = 14;
      const pulseSize = baseTriggerSize + pulseRef.current * 24;
      
      ctx.beginPath();
      ctx.arc(triggerX, triggerY, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();

      const handLength = radius * 0.82;
      const handX = centerX + Math.cos(angle) * handLength;
      const handY = centerY + Math.sin(angle) * handLength;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(handX, handY);
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
      ctx.fillStyle = fgColor;
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [playerUpdate, conductorPresent, audioStarted, audioSuspended, getServerTime, playNote]);

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);

  if (!hasJoined || !isJoined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 left-4"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <CardHeader className="pt-12">
            <CardTitle className="text-center text-2xl">Join as Player</CardTitle>
            <CardDescription className="text-center">
              Enter your name to join the performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
                autoFocus
                data-testid="input-player-name"
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={!name.trim() || !isConnected}
                data-testid="button-join"
              >
                {isConnected ? "Join Performance" : "Connecting..."}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!conductorPresent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Badge variant="secondary" className="mb-8" data-testid="badge-player-name">
          {name}
        </Badge>
        <div className="text-center">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted animate-pulse" />
            <h2 className="text-2xl font-medium text-foreground mb-2" data-testid="text-waiting-title">
              Waiting for Conductor
            </h2>
            <p className="text-muted-foreground" data-testid="text-waiting-message">
              The performance will begin when a conductor joins...
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          data-testid="button-leave"
        >
          Leave
        </Button>
      </div>
    );
  }

  if (!audioStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Badge variant="secondary" className="mb-8" data-testid="badge-player-name">
          {name}
        </Badge>
        <div className="text-center">
          <div className="mb-8">
            <Volume2 className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-medium text-foreground mb-2" data-testid="text-start-title">
              Ready to Play
            </h2>
            <p className="text-muted-foreground mb-6" data-testid="text-start-message">
              Click below to enable audio and start receiving your score
            </p>
            <Button 
              size="lg"
              onClick={startAudio}
              data-testid="button-start-audio"
            >
              <Volume2 className="w-5 h-5 mr-2" />
              Start Audio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Audio suspended overlay - show when audio context is suspended
  if (audioSuspended) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Badge variant="secondary" className="mb-8" data-testid="badge-player-name">
          {name}
        </Badge>
        <div className="text-center">
          <div className="mb-8">
            <Volume2 className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-medium text-foreground mb-2" data-testid="text-resume-title">
              Audio Paused
            </h2>
            <p className="text-muted-foreground mb-6" data-testid="text-resume-message">
              Tap below to resume the audio
            </p>
            <Button 
              size="lg"
              onClick={resumeAudio}
              data-testid="button-resume-audio"
            >
              <Volume2 className="w-5 h-5 mr-2" />
              Resume Audio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="secondary" data-testid="badge-player-name-score">
          {name}
        </Badge>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation("/")}
          data-testid="button-exit"
        >
          Exit
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative w-full max-w-lg aspect-square">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full"
            data-testid="canvas-score"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span 
              className="text-6xl md:text-7xl font-bold text-foreground"
              data-testid="text-note-name"
            >
              {playerUpdate ? midiToNoteName(playerUpdate.pitch) : "—"}
            </span>
          </div>
        </div>
        <div className="mt-6 text-sm text-muted-foreground" data-testid="text-interval">
          Interval: {playerUpdate?.interval ?? 0} ms
        </div>
      </div>
    </div>
  );
}
