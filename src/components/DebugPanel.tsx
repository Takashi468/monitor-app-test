import React, { useState, useEffect, useRef, useCallback } from 'react';
import { subscribe, clearLogs, LogEntry } from '../lib/debugLogger';

interface VideoState {
  streamUrls: string[];
  videoServerPort: number | null;
  isOnline: boolean;
  isServerReachable: boolean;
}

interface DebugPanelProps {
  videoState: VideoState;
}

const LEVEL_STYLE: Record<string, string> = {
  log:   'text-green-300',
  info:  'text-blue-300',
  warn:  'text-yellow-300',
  error: 'text-red-400',
};

const LEVEL_BG: Record<string, string> = {
  log:   'bg-green-500/10',
  info:  'bg-blue-500/10',
  warn:  'bg-yellow-500/10',
  error: 'bg-red-500/15',
};

const LEVEL_BADGE: Record<string, string> = {
  log:   'bg-green-500/20 text-green-300',
  info:  'bg-blue-500/20 text-blue-300',
  warn:  'bg-yellow-500/20 text-yellow-300',
  error: 'bg-red-500/20 text-red-300',
};

export const DebugPanel: React.FC<DebugPanelProps> = ({ videoState }) => {
  const [isOpen, setIsOpen]   = useState(false);
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [filter, setFilter]   = useState<string>('all');
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logsEndRef  = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Subscribe to log stream
  useEffect(() => subscribe(setLogs), []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Secret trigger: tap the top-left corner 5 times quickly to open panel
  const handleCornerTap = useCallback(() => {
    setTapCount(prev => {
      const next = prev + 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapCount(0), 1500);
      if (next >= 5) {
        setIsOpen(o => !o);
        return 0;
      }
      return next;
    });
  }, []);

  const filtered = filter === 'all'
    ? logs
    : logs.filter(l => l.level === filter);

  const counts = {
    log:   logs.filter(l => l.level === 'log').length,
    info:  logs.filter(l => l.level === 'info').length,
    warn:  logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  return (
    <>
      {/* ── Secret tap zone (top-left corner, 60×60) ── */}
      <div
        onPointerDown={handleCornerTap}
        className="fixed top-0 left-0 w-16 h-16 z-[9999] select-none"
        style={{ touchAction: 'none' }}
      >
        {tapCount > 0 && tapCount < 5 && (
          <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            {5 - tapCount}
          </div>
        )}
      </div>

      {/* ── Debug Panel ── */}
      {isOpen && (
        <div className="fixed inset-0 z-[9998] flex flex-col bg-[#0d1117]/95 backdrop-blur-md font-mono text-xs">

          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border-b border-white/10 shrink-0">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 tracking-wider uppercase">DEBUG</span>
            <span className="text-white/50 text-[10px]">Tap top-left ×5 to toggle</span>
            <div className="flex-1" />
            <button
              onPointerDown={() => clearLogs()}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors text-[10px] uppercase tracking-wide"
            >
              Clear
            </button>
            <button
              onPointerDown={() => setIsOpen(false)}
              className="px-2 py-1 rounded bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors text-[10px]"
            >
              ✕ Close
            </button>
          </div>

          {/* State cards */}
          <div className="grid grid-cols-2 gap-2 px-3 py-2 bg-[#0d1117] border-b border-white/10 shrink-0">
            {/* Network */}
            <div className="rounded-lg bg-white/5 p-2 flex flex-col gap-1">
              <span className="text-white/40 text-[9px] uppercase tracking-wider font-bold">Network</span>
              <div className="flex gap-1 items-center">
                <span className={`w-2 h-2 rounded-full ${videoState.isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-white/70">{videoState.isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex gap-1 items-center">
                <span className={`w-2 h-2 rounded-full ${videoState.isServerReachable ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-white/70">Server: {videoState.isServerReachable ? 'OK' : 'Unreachable'}</span>
              </div>
            </div>

            {/* Video server */}
            <div className="rounded-lg bg-white/5 p-2 flex flex-col gap-1">
              <span className="text-white/40 text-[9px] uppercase tracking-wider font-bold">Video Server</span>
              <div className="flex gap-1 items-center">
                <span className={`w-2 h-2 rounded-full ${videoState.videoServerPort !== null ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                <span className="text-white/70">
                  {videoState.videoServerPort !== null
                    ? `127.0.0.1:${videoState.videoServerPort}`
                    : 'Starting…'}
                </span>
              </div>
              <span className="text-white/40 text-[9px]">{videoState.streamUrls.length} URL(s) in playlist</span>
            </div>

            {/* Stream URLs */}
            <div className="col-span-2 rounded-lg bg-white/5 p-2 flex flex-col gap-1">
              <span className="text-white/40 text-[9px] uppercase tracking-wider font-bold">Playlist URLs</span>
              {videoState.streamUrls.length === 0 ? (
                <span className="text-white/30 italic">No URLs</span>
              ) : (
                videoState.streamUrls.map((url, i) => (
                  <div key={i} className="text-[9px] text-cyan-300 break-all leading-snug">{url}</div>
                ))
              )}
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex gap-1 px-3 py-1.5 bg-[#0d1117] border-b border-white/10 shrink-0">
            {(['all', 'log', 'info', 'warn', 'error'] as const).map(level => (
              <button
                key={level}
                onPointerDown={() => setFilter(level)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide transition-colors ${
                  filter === level
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                {level === 'all' ? `All (${logs.length})` : `${level} (${counts[level as keyof typeof counts] ?? 0})`}
              </button>
            ))}
            <div className="flex-1" />
            <label className="flex items-center gap-1 text-white/40 text-[10px] cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-scroll
            </label>
          </div>

          {/* Log list */}
          <div className="flex-1 overflow-y-auto px-2 py-1">
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-20 text-white/20 text-xs">No logs</div>
            )}
            {filtered.map(entry => (
              <div
                key={entry.id}
                className={`flex gap-2 px-2 py-1 rounded mb-0.5 items-start ${LEVEL_BG[entry.level]}`}
              >
                <span className="text-white/25 text-[9px] shrink-0 mt-0.5 tabular-nums">{entry.time}</span>
                <span className={`text-[9px] font-bold shrink-0 px-1 rounded mt-0.5 uppercase ${LEVEL_BADGE[entry.level]}`}>
                  {entry.level[0].toUpperCase()}
                </span>
                <span className={`text-[10px] leading-snug break-all whitespace-pre-wrap ${LEVEL_STYLE[entry.level]}`}>
                  {entry.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </>
  );
};
