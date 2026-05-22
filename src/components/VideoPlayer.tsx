import React, { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  urls: string[];
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ urls }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Switch to next video in the playlist (loop back to 0)
  const playNext = () => {
    const video = videoRef.current;
    if (!video || urls.length === 0) return;

    if (urls.length === 1) {
      // If there's only 1 video, state won't change, so we manually restart it
      video.currentTime = 0;
      video.play().catch(console.error);
    } else {
      // If multiple videos, go to the next one
      setCurrentIndex(prev => (prev + 1) % urls.length);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || urls.length === 0) return;
    
    video.src = urls[currentIndex];
    video.load();
    video.play().catch(() => {
      // If play is blocked, try again after a short delay
      setTimeout(() => video.play().catch(console.error), 500);
    });
  }, [currentIndex, urls]);

  if (urls.length === 0) {
    return (
      <div className="video-placeholder">
        <div className="loading-spinner" />
        <span>กำลังโหลดวิดีโอ...</span>
      </div>
    );
  }

  return (
    <div className="video-wrapper">
      <video
        ref={videoRef}
        onEnded={playNext}
        onError={playNext}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
};
