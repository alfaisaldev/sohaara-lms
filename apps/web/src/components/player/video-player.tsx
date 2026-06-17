'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  startTime?: number;
}

export function VideoPlayer({ src, poster, onProgress, onComplete, startTime }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<number>(0);

  if (!src) return null;

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;

    const progress = (video.currentTime / video.duration) * 100;
    const rounded = Math.round(progress);

    if (rounded !== progressRef.current) {
      progressRef.current = rounded;
      onProgress(rounded);
      if (rounded >= 90 && onComplete) onComplete();
    }
  }, [onProgress, onComplete]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !startTime) return;
    video.currentTime = startTime;
  }, [startTime]);

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        controls
        onTimeUpdate={handleTimeUpdate}
        playsInline
        preload="metadata"
      />
    </div>
  );
}
