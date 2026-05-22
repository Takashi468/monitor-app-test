import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  urls: string[];
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ urls }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFirstPlayStarted, setHasFirstPlayStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset the first play state if the playlist becomes empty
  useEffect(() => {
    if (urls.length === 0) {
      setHasFirstPlayStarted(false);
      setIsPlaying(false);
    }
  }, [urls]);

  // Switch to next video in the playlist (loop back to 0)
  const playNext = useCallback(() => {
    const video = videoRef.current;
    if (!video || urls.length === 0) return;

    setIsPlaying(false);
    if (urls.length === 1) {
      // If there's only 1 video, state won't change, so we manually restart it
      video.currentTime = 0;
      video.load();
      video.play().catch(console.error);
    } else {
      // If multiple videos, go to the next one
      setCurrentIndex(prev => (prev + 1) % urls.length);
    }
  }, [urls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || urls.length === 0) return;
    
    setIsPlaying(false);
    video.src = urls[currentIndex];
    video.load();

    let hasStarted = false;

    const handlePlaying = () => {
      hasStarted = true;
      setIsPlaying(true);
      setHasFirstPlayStarted(true);
    };

    video.addEventListener('playing', handlePlaying);

    // Watchdog timeout: skip if the video doesn't fire 'playing' within 2 seconds
    // This is crucial for offline/unreachable remote video timeouts
    const timeoutId = setTimeout(() => {
      if (!hasStarted) {
        console.warn(`Video playback timeout (2s) for: ${urls[currentIndex]}. Skipping to next.`);
        playNext();
      }
    }, 2000);

    video.play().catch(() => {
      // Retry once after a short delay if initial autoplay was blocked
      const retryTimeout = setTimeout(() => {
        if (!hasStarted && video) {
          video.play().catch(err => {
            console.error("Autoplay retry failed:", err);
            // Skip immediately if it fails and we are offline
            if (!navigator.onLine) {
              playNext();
            }
          });
        }
      }, 500);
      return () => clearTimeout(retryTimeout);
    });

    return () => {
      clearTimeout(timeoutId);
      if (video) {
        video.removeEventListener('playing', handlePlaying);
      }
    };
  }, [currentIndex, urls, playNext]);

  // Handle errors immediately by skipping
  const handleVideoError = () => {
    console.error(`Video error playing: ${urls[currentIndex]}. Skipping.`);
    playNext();
  };

  if (urls.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <span className="text-white/60 text-lg font-light tracking-[0.2em] uppercase">connecting</span>
      </div>
    );
  }

  const showVideo = isPlaying || hasFirstPlayStarted;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-3xl">
      {/* Pure Black Connecting Overlay - Only shown on initial startup load */}
      {!hasFirstPlayStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
          <span className="text-white/60 text-lg font-light tracking-[0.2em] uppercase">connecting</span>
        </div>
      )}

      <video
        ref={videoRef}
        onEnded={playNext}
        onError={handleVideoError}
        autoPlay
        muted
        playsInline
        poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        className="object-cover block transition-opacity duration-500 ease-in-out"
        style={{
          opacity: showVideo ? 1 : 0,
          width: showVideo ? '100%' : '1px',
          height: showVideo ? '100%' : '1px',
          position: showVideo ? 'relative' : 'absolute',
          top: showVideo ? 'auto' : '-9999px',
          left: showVideo ? 'auto' : '-9999px',
        }}
      />
    </div>
  );
};

