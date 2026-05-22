import { useState, useEffect, useMemo, useRef } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

interface VideoItem {
  name: string;
  url: string;
  stream_url: string; // The remote download URL
  local_path?: string; // Cached file absolute path on disk
  is_downloaded: boolean;
}

// Simple hash function to generate clean unique filenames
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Clean name to make it a safe filename (includes Thai and alphanumeric)
function getSafeFilename(name: string, url: string): string {
  const urlParts = url.split('/');
  const lastPart = urlParts[urlParts.length - 1] || '';
  const extParts = lastPart.split('.');
  const ext = extParts.length > 1 ? `.${extParts[extParts.length - 1].split('?')[0]}` : '.mp4';
  
  const cleanName = name.replace(/[^a-zA-Z0-9ก-๙เ-็่-๊ํ๎๏๚]/g, '_');
  return `${cleanName}_${hashCode(url)}${ext}`;
}

export function useVideoManager() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const downloadingRefs = useRef<Set<string>>(new Set());

  // 1. Load cached videos list on mount and verify that local files exist (Skip on Android)
  useEffect(() => {
    if (isAndroid) return;
    const cached = localStorage.getItem('cached_videos');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as VideoItem[];
        
        const verifyCachedFiles = async () => {
          const verified = await Promise.all(
            parsed.map(async v => {
              if (v.is_downloaded && v.local_path) {
                try {
                  const filename = getSafeFilename(v.name, v.stream_url);
                  const path = await invoke<string | null>('get_cached_video_path', { filename });
                  if (path) {
                    return { ...v, local_path: path, is_downloaded: true };
                  }
                } catch (err) {
                  console.error(`Error verifying cached file for ${v.name}:`, err);
                }
              }
              return { ...v, is_downloaded: false, local_path: undefined };
            })
          );
          setVideos(verified);
        };
        
        verifyCachedFiles();
      } catch (e) {
        console.error('Failed to parse cached videos:', e);
      }
    }
  }, []);

  // 2. Fetch videos from API
  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://10.1.60.222:3000/api/videos');
      if (!response.ok) throw new Error('Failed to fetch videos from API');
      const data = await response.json();

      const apiVideos = (data.videos || []).map((v: { name: string; url: string; download_url: string }) => ({
        name: v.name,
        url: v.url,
        stream_url: v.download_url,
      }));

      if (isAndroid) {
        setVideos(apiVideos.map((v: any) => ({ ...v, is_downloaded: false })));
        return;
      }

      setVideos(prevVideos => {
        const merged = apiVideos.map((apiVid: { name: string; url: string; stream_url: string }) => {
          const cachedVid = prevVideos.find(p => p.stream_url === apiVid.stream_url || p.name === apiVid.name);
          if (cachedVid && cachedVid.is_downloaded && cachedVid.local_path) {
            return {
              ...apiVid,
              local_path: cachedVid.local_path,
              is_downloaded: true,
            };
          }
          return {
            ...apiVid,
            is_downloaded: false,
          };
        });

        localStorage.setItem('cached_videos', JSON.stringify(merged));
        return merged;
      });
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

  // 3. Background download for undownloaded videos (Skip on Android)
  useEffect(() => {
    if (isAndroid) return;
    videos.forEach(video => {
      if (!video.is_downloaded && !downloadingRefs.current.has(video.stream_url)) {
        downloadingRefs.current.add(video.stream_url);
        
        const filename = getSafeFilename(video.name, video.stream_url);
        
        invoke<string>('download_video', { url: video.stream_url, filename })
          .then(localPath => {
            console.log(`Successfully cached ${video.name} to ${localPath}`);
            setVideos(prev => {
              const next = prev.map(v => {
                if (v.stream_url === video.stream_url) {
                  return { ...v, local_path: localPath, is_downloaded: true };
                }
                return v;
              });
              localStorage.setItem('cached_videos', JSON.stringify(next));
              return next;
            });
          })
          .catch(err => {
            console.error(`Failed to download ${video.name}:`, err);
          })
          .finally(() => {
            downloadingRefs.current.delete(video.stream_url);
          });
      }
    });
  }, [videos]);

  // 4. Return play URLs (converted to local asset URL if downloaded, otherwise fallback to remote)
  const streamUrls = useMemo(() => {
    return videos.map(v => {
      if (isAndroid) {
        return v.url; // Use streaming URL directly on Android
      }
      if (v.is_downloaded && v.local_path) {
        return convertFileSrc(v.local_path);
      }
      return v.stream_url;
    });
  }, [videos]);

  return { streamUrls, videos, isLoading };
}
