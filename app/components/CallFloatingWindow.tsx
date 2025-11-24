"use client";

import React, { useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallFloatingWindowProps {
  roomId: string;
  token: string;
  onLeave: () => void;
}

export function CallFloatingWindow({
  token,
  onLeave,
}: CallFloatingWindowProps) {
  if (!token) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // Disable scrolling on the body when the call window is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <Rnd
      default={{
        x: window.innerWidth - 450,
        y: 80,
        width: 420,
        height: 320,
      }}
      minWidth={320}
      minHeight={240}
      bounds="parent"
      dragHandleClassName="drag-handle"
      disableDragging={false}
      style={{ zIndex: 50 }}
    >
      <div className="flex flex-col h-full w-full glass rounded-xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header / Drag Handle */}
        <div className="drag-handle h-10 bg-white/5 flex items-center justify-between px-3 cursor-move select-none border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-white/80">Live Call</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/70 hover:bg-destructive/80 hover:text-white"
              onClick={onLeave}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden bg-black/20">
          <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: "100%" }}
            onDisconnected={onLeave}
          >
            <MyVideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    </Rnd>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="relative h-full w-full group">
      <GridLayout tracks={tracks} style={{ height: "100%" }}>
        <ParticipantTile />
      </GridLayout>

      {/* Overlay Controls - Visible on hover or if muted/video off */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
        <CustomControlBar />
      </div>
    </div>
  );
}

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

function CustomControlBar() {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Fix: Avoid setting state during render/effect if possible, or use a better pattern.
  // LiveKit hooks usually provide the state directly.
  // We'll sync state only when it changes.
  useEffect(() => {
    if (localParticipant) {
      const muted = !localParticipant.isMicrophoneEnabled;
      const video = localParticipant.isCameraEnabled;

      // Only update if changed to avoid loops/unnecessary renders
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMuted((prev) => (prev !== muted ? muted : prev));
      setIsVideoEnabled((prev) => (prev !== video ? video : prev));
    }
  }, [
    localParticipant,
    localParticipant?.isMicrophoneEnabled,
    localParticipant?.isCameraEnabled,
  ]);

  const toggleMicrophone = async () => {
    if (localParticipant) {
      const newState = !isMuted;
      await localParticipant.setMicrophoneEnabled(!newState);
      setIsMuted(newState);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const newState = !isVideoEnabled;
      await localParticipant.setCameraEnabled(newState);
      setIsVideoEnabled(newState);
    }
  };

  const handleDisconnect = () => {
    room.disconnect();
  };

  return (
    <div className="h-14 px-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-4 shadow-2xl">
      <Button
        variant={isMuted ? "destructive" : "ghost"}
        size="icon"
        className={`rounded-full w-10 h-10 transition-all duration-200 ${
          isMuted
            ? "bg-red-500 hover:bg-red-600 border-red-400/50 text-white"
            : "bg-white/10 hover:bg-white/20 text-white hover:text-white"
        }`}
        onClick={toggleMicrophone}
      >
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </Button>

      <Button
        variant={!isVideoEnabled ? "destructive" : "ghost"}
        size="icon"
        className={`rounded-full w-10 h-10 transition-all duration-200 ${
          !isVideoEnabled
            ? "bg-red-500 hover:bg-red-600 border-red-400/50 text-white"
            : "bg-white/10 hover:bg-white/20 text-white hover:text-white"
        }`}
        onClick={toggleCamera}
      >
        {!isVideoEnabled ? <VideoOff size={18} /> : <Video size={18} />}
      </Button>

      <div className="w-px h-6 bg-white/20" />

      <Button
        variant="destructive"
        size="icon"
        className="rounded-full w-10 h-10 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
        onClick={handleDisconnect}
      >
        <PhoneOff size={18} />
      </Button>
    </div>
  );
}
