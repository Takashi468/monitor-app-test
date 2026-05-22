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
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isServerReachable, setIsServerReachable] = useState(false);
  
  const downloadingRefs = useRef<Set<string>>(new Set());
  const loadingBlobsRef = useRef<Set<string>>(new Set());

  // Track network online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Load cached videos list on mount and verify that local files exist
  useEffect(() => {
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

      setIsServerReachable(true);

      const apiVideos = (data.videos || []).map((v: { name: string; url: string; download_url: string }) => ({
        name: v.name,
        url: v.url,
        stream_url: v.download_url,
      }));

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
      setIsServerReachable(false);
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

  // 3. Background download for undownloaded videos
  useEffect(() => {
    // Only attempt downloads when online and the server is reachable
    if (!isOnline || !isServerReachable) return;

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
  }, [videos, isOnline, isServerReachable]);

  // 3b. [Android Only] Load downloaded video files into memory Blobs on-demand
  useEffect(() => {
    if (!isAndroid) return;

    videos.forEach(video => {
      if (video.is_downloaded && !blobUrls[video.stream_url] && !loadingBlobsRef.current.has(video.stream_url)) {
        loadingBlobsRef.current.add(video.stream_url);

        const filename = getSafeFilename(video.name, video.stream_url);

        invoke<number[]>('read_video_file', { filename })
          .then(bytes => {
            const uint8 = new Uint8Array(bytes);
            const blob = new Blob([uint8], { type: 'video/mp4' });
            const blobUrl = URL.createObjectURL(blob);

            console.log(`Successfully generated Blob URL for ${video.name}: ${blobUrl}`);
            setBlobUrls(prev => ({
              ...prev,
              [video.stream_url]: blobUrl
            }));
          })
          .catch(err => {
            console.error(`Failed to load Blob for ${video.name}:`, err);
          })
          .finally(() => {
            loadingBlobsRef.current.delete(video.stream_url);
          });
      }
    });
  }, [videos, blobUrls]);

  // 3c. Clean up unused Blob URLs when videos list changes to avoid memory leaks
  useEffect(() => {
    if (!isAndroid) return;

    const activeUrls = new Set(videos.map(v => v.stream_url));
    setBlobUrls(prev => {
      const next = { ...prev };
      let changed = false;
 
      Object.keys(next).forEach(urlKey => {
        if (!activeUrls.has(urlKey)) {
          URL.revokeObjectURL(next[urlKey]);
          delete next[urlKey];
          changed = true;
          console.log(`Revoked unused Blob URL for ${urlKey}`);
        }
      });

      return changed ? next : prev;
    });
  }, [videos]);

  // 3d. Revoke all Blob URLs on unmount
  useEffect(() => {
    return () => {
      if (!isAndroid) return;
      setBlobUrls(prev => {
        Object.values(prev).forEach(url => {
          URL.revokeObjectURL(url);
          console.log(`Revoked Blob URL on unmount: ${url}`);
        });
        return {};
      });
    };
  }, []);

  // 4. Return play URLs (converted to local asset URL or Blob URL if downloaded, otherwise fallback to remote)
  const streamUrls = useMemo(() => {
    // If offline or the server is down/unreachable, filter to ONLY show downloaded videos
    // to prevent the player trying to load unreachable remote URLs
    const playableVideos = videos.filter(v => {
      if (!isOnline || !isServerReachable) {
        return v.is_downloaded && v.local_path;
      }
      return true;
    });

    return playableVideos.map(v => {
      if (v.is_downloaded) {
        if (isAndroid) {
          return blobUrls[v.stream_url] || v.stream_url;
        } else if (v.local_path) {
          return convertFileSrc(v.local_path);
        }
      }
      return v.stream_url;
    });
  }, [videos, blobUrls, isOnline, isServerReachable]);

  return { streamUrls, videos, isLoading, isOnline, isServerReachable };
}
