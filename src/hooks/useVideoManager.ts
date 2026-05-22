import { useState, useEffect, useMemo } from 'react';

interface VideoItem {
  name: string;
  url: string;
  stream_url: string;
}

export function useVideoManager() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://10.1.60.222:3000/api/videos');
      if (!response.ok) throw new Error('Failed to fetch videos from API');
      const data = await response.json();

      const apiVideos = (data.videos || []).map((v: { name: string; url: string; download_url: string }) => ({
        name: v.name,
        url: v.url,         // Use streaming URL directly — no local download needed on Android
        stream_url: v.download_url,
      }));

      setVideos(apiVideos);
    } catch (err) {
      console.error('Error fetching API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // Re-fetch every 10 minutes to pick up new/removed videos
    const interval = setInterval(fetchVideos, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Return plain stream URLs for the player (memoized to prevent re-renders in App)
  const streamUrls = useMemo(() => videos.map(v => v.stream_url), [videos]);

  return { streamUrls, videos, isLoading };
}
