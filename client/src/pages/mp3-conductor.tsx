import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/use-socket";
import { ArrowLeft, Upload, Play, Square, Music, User, CheckCircle, Clock, Trash2 } from "lucide-react";
import type { Mp3SyncState, Mp3Slot } from "@shared/schema";
import { MAX_SLOTS } from "@shared/schema";

export default function Mp3Conductor() {
  const [, setLocation] = useLocation();
  const { socket, isConnected } = useSocket();
  const [isJoined, setIsJoined] = useState(false);
  const [slots, setSlots] = useState<Mp3Slot[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (socket && isConnected && !isJoined) {
      socket.emit("joinMp3Conductor");
    }
  }, [socket, isConnected, isJoined]);

  useEffect(() => {
    if (!socket) return;

    const onFullState = (state: Mp3SyncState) => {
      setSlots(state.slots);
      setIsPlaying(state.playState?.playing ?? false);
      setIsJoined(true);
    };

    const onStateUpdate = (state: Mp3SyncState) => {
      setSlots(state.slots);
      setIsPlaying(state.playState?.playing ?? false);
    };

    socket.on("mp3FullState", onFullState);
    socket.on("mp3StateUpdate", onStateUpdate);

    return () => {
      socket.off("mp3FullState", onFullState);
      socket.off("mp3StateUpdate", onStateUpdate);
    };
  }, [socket]);

  const handleFileUpload = useCallback(async (slotIndex: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/upload/slot/${slotIndex}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Upload failed:", error);
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
  }, []);

  const handleFileInputChange = useCallback((slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(slotIndex, file);
    }
    e.target.value = "";
  }, [handleFileUpload]);

  const handleDrop = useCallback((slotIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3"))) {
      handleFileUpload(slotIndex, file);
    }
  }, [handleFileUpload]);

  const handlePlay = useCallback(() => {
    if (socket) {
      socket.emit("mp3Play", { seekSeconds });
    }
  }, [socket, seekSeconds]);

  const handleStop = useCallback(() => {
    if (socket) {
      socket.emit("mp3Stop");
    }
  }, [socket]);

  const handleDeleteFile = useCallback(async (slotIndex: number) => {
    try {
      const response = await fetch(`/api/slot/${slotIndex}/file`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        console.error("Delete failed:", error);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }, []);

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

  const connectedCount = slots.filter(s => s.playerSocketId).length;
  const readyCount = slots.filter(s => s.ready).length;
  const filesAssigned = slots.filter(s => s.fileId).length;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
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
              <Music className="w-5 h-5 text-foreground" />
              <h1 className="text-lg font-medium tracking-tight" data-testid="text-mp3-conductor-title">
                MP3 Sync Conductor
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" data-testid="badge-connected">
              <User className="w-3 h-3 mr-1" />
              {connectedCount}/{MAX_SLOTS} connected
            </Badge>
            <Badge variant="outline" data-testid="badge-ready">
              <CheckCircle className="w-3 h-3 mr-1" />
              {readyCount} ready
            </Badge>
            <Badge variant="outline" data-testid="badge-files">
              <Music className="w-3 h-3 mr-1" />
              {filesAssigned} files
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-medium">Playback Controls</CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={seekSeconds}
                  onChange={(e) => setSeekSeconds(parseFloat(e.target.value) || 0)}
                  className="w-24"
                  placeholder="Seek (s)"
                  data-testid="input-seek"
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
              {isPlaying ? (
                <Button onClick={handleStop} variant="destructive" data-testid="button-stop">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button onClick={handlePlay} data-testid="button-play">
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Button>
              )}
            </div>
          </CardHeader>
          {isPlaying && (
            <CardContent>
              <Badge variant="default" className="bg-green-600">Playing</Badge>
            </CardContent>
          )}
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {slots.map((slot, index) => (
            <Card 
              key={slot.slotIndex}
              className="relative"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(slot.slotIndex, e)}
              data-testid={`card-slot-${slot.slotIndex}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-medium">
                    Slot {slot.slotIndex + 1}
                  </CardTitle>
                  {slot.ready && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      Ready
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className={slot.playerName ? "text-foreground" : "text-muted-foreground"}>
                    {slot.playerName || "Empty"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className={slot.fileName ? "text-foreground truncate" : "text-muted-foreground"} title={slot.fileName || undefined}>
                      {slot.fileName || "No file"}
                    </span>
                  </div>
                  {slot.fileId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteFile(slot.slotIndex)}
                      data-testid={`button-delete-${slot.slotIndex}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {slot.duration !== null && (
                  <div className="text-xs text-muted-foreground">
                    Duration: {slot.duration.toFixed(1)}s
                  </div>
                )}

                <div className="pt-2">
                  <input
                    ref={(el) => { fileInputRefs.current[index] = el; }}
                    type="file"
                    accept="audio/mpeg,.mp3"
                    className="hidden"
                    onChange={(e) => handleFileInputChange(slot.slotIndex, e)}
                    data-testid={`input-file-${slot.slotIndex}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    data-testid={`button-upload-${slot.slotIndex}`}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload MP3
                  </Button>
                </div>

                <div className="text-xs text-center text-muted-foreground border-t pt-2">
                  or drag & drop
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
