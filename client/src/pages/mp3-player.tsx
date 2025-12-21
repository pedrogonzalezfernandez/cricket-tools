import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/use-socket";
import { ArrowLeft, Music, Volume2, Loader2 } from "lucide-react";
import type { Mp3PlayerAssignment, Mp3PlayerPlay } from "@shared/schema";

export default function Mp3Player() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [slotIndex, setSlotIndex] = useState<number | null>(null);
  const [assignedFile, setAssignedFile] = useState<{ fileId: string | null; fileName: string | null }>({
    fileId: null,
    fileName: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  
  const { socket, isConnected, getServerTime } = useSocket();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const currentFileIdRef = useRef<string | null>(null);
  const currentPlayIdRef = useRef<string | null>(null);

  const enableAudio = useCallback(async () => {
    try {
      const ctx = new AudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      audioContextRef.current = ctx;
      setAudioEnabled(true);
      console.log("Audio enabled, sample rate:", ctx.sampleRate);
    } catch (err) {
      console.error("Failed to enable audio:", err);
      setError("Failed to enable audio");
    }
  }, []);

  const loadAudioFile = useCallback(async (fileId: string) => {
    if (!audioContextRef.current) return;
    
    setIsLoading(true);
    setIsReady(false);
    setError(null);

    try {
      console.log("Loading audio file:", fileId);
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audio file");
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      audioBufferRef.current = audioBuffer;
      currentFileIdRef.current = fileId;
      setDuration(audioBuffer.duration);
      setIsReady(true);
      setIsLoading(false);

      console.log("Audio loaded, duration:", audioBuffer.duration);

      if (socket && slotIndex !== null) {
        socket.emit("mp3Ready", {
          slotIndex,
          fileId,
          duration: audioBuffer.duration,
          ready: true,
        });
      }
    } catch (err) {
      console.error("Failed to load audio:", err);
      setError("Failed to load audio file");
      setIsLoading(false);
    }
  }, [socket, slotIndex]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore errors from already stopped sources
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    currentPlayIdRef.current = null;
  }, []);

  const schedulePlayback = useCallback((serverStartTimeMs: number, seekSeconds: number, playId: string) => {
    if (!audioContextRef.current || !audioBufferRef.current) {
      console.log("Cannot play: no audio context or buffer");
      return;
    }

    stopPlayback();

    const ctx = audioContextRef.current;
    const buffer = audioBufferRef.current;

    if (seekSeconds >= buffer.duration) {
      console.log("Seek position beyond duration, silent");
      return;
    }

    const estimatedServerNow = getServerTime();
    const secondsUntilStart = (serverStartTimeMs - estimatedServerNow) / 1000;
    const scheduleTime = ctx.currentTime + Math.max(secondsUntilStart, 0);

    console.log(`Scheduling playback: start in ${secondsUntilStart.toFixed(3)}s, seek=${seekSeconds}s`);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      if (currentPlayIdRef.current === playId) {
        setIsPlaying(false);
        currentPlayIdRef.current = null;
      }
    };

    source.start(scheduleTime, seekSeconds);
    sourceNodeRef.current = source;
    currentPlayIdRef.current = playId;
    setIsPlaying(true);
  }, [getServerTime, stopPlayback]);

  const handleJoin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && socket) {
      socket.emit("joinMp3Player", { name: name.trim() });
    }
  }, [name, socket]);

  useEffect(() => {
    if (!socket) return;

    const onJoinSuccess = (data: { slotIndex: number; fileId: string | null; fileName: string | null }) => {
      setSlotIndex(data.slotIndex);
      setAssignedFile({ fileId: data.fileId, fileName: data.fileName });
      setHasJoined(true);
      console.log("Joined as slot:", data.slotIndex);

      if (data.fileId && audioContextRef.current) {
        loadAudioFile(data.fileId);
      }
    };

    const onJoinError = (data: { error: string }) => {
      setError(data.error);
    };

    const onAssignment = (data: Mp3PlayerAssignment) => {
      if (data.slotIndex === slotIndex) {
        setAssignedFile({ fileId: data.fileId, fileName: data.fileName });
        setIsReady(false);

        if (data.fileId && audioContextRef.current) {
          loadAudioFile(data.fileId);
        }
      }
    };

    const onPlay = (data: Mp3PlayerPlay) => {
      if (data.slotIndex === slotIndex && data.fileId === currentFileIdRef.current) {
        schedulePlayback(data.serverStartTimeMs, data.seekSeconds, data.playId);
      }
    };

    const onStop = () => {
      stopPlayback();
    };

    socket.on("mp3JoinSuccess", onJoinSuccess);
    socket.on("mp3JoinError", onJoinError);
    socket.on("mp3Assignment", onAssignment);
    socket.on("mp3Play", onPlay);
    socket.on("mp3Stop", onStop);

    return () => {
      socket.off("mp3JoinSuccess", onJoinSuccess);
      socket.off("mp3JoinError", onJoinError);
      socket.off("mp3Assignment", onAssignment);
      socket.off("mp3Play", onPlay);
      socket.off("mp3Stop", onStop);
    };
  }, [socket, slotIndex, loadAudioFile, schedulePlayback, stopPlayback]);

  useEffect(() => {
    if (hasJoined && audioEnabled && assignedFile.fileId && !audioBufferRef.current) {
      loadAudioFile(assignedFile.fileId);
    }
  }, [hasJoined, audioEnabled, assignedFile.fileId, loadAudioFile]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-border animate-pulse-ring" />
          <p className="text-muted-foreground font-light">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 animate-fade-in">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-border flex items-center justify-center">
              <Music className="w-7 h-7 text-foreground" />
            </div>
            <CardTitle className="text-xl font-medium tracking-tight">Join MP3 Sync</CardTitle>
            <CardDescription className="text-muted-foreground font-light">
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
                maxLength={50}
                data-testid="input-name"
              />
              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!name.trim()}
                data-testid="button-join"
              >
                Join
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/")}
                data-testid="button-back-landing"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Badge variant="outline" data-testid="badge-slot">
            Slot {(slotIndex ?? 0) + 1}
          </Badge>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-medium">{name}</CardTitle>
            <CardDescription>MP3 Player</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!audioEnabled && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Tap to enable audio playback
                </p>
                <Button onClick={enableAudio} size="lg" data-testid="button-enable-audio">
                  <Volume2 className="w-5 h-5 mr-2" />
                  Enable Audio
                </Button>
              </div>
            )}

            {audioEnabled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Assigned File</span>
                    {isReady && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Ready
                      </Badge>
                    )}
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : assignedFile.fileName ? (
                      <span className="truncate block" data-testid="text-filename">
                        {assignedFile.fileName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground" data-testid="text-no-file">
                        Waiting for file assignment...
                      </span>
                    )}
                  </div>
                </div>

                {duration !== null && (
                  <div className="text-center text-sm text-muted-foreground">
                    Duration: {duration.toFixed(1)} seconds
                  </div>
                )}

                <div className="text-center">
                  {isPlaying ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-lg font-medium" data-testid="text-status-playing">Playing</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground" data-testid="text-status-idle">
                      {isReady ? "Ready - waiting for conductor" : "Waiting for file..."}
                    </span>
                  )}
                </div>

                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
