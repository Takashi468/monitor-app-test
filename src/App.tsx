import { useState, useEffect } from "react";
import { useVideoManager } from "./hooks/useVideoManager";
import { VideoPlayer } from "./components/VideoPlayer";
import "./App.css";

// ─── Queue rows (placeholder data – replace with real API if needed) ───────────
const QUEUE_ROWS = [
  { counter: "01", ticket: "A001" },
  { counter: "02", ticket: "A015" },
  { counter: "03", ticket: "B003" },
  { counter: "04", ticket: "A022" },
  { counter: "05", ticket: "C007" },
];

// ─── Date / Time helpers ───────────────────────────────────────────────────────
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function formatThaiDate(d: Date) {
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

function formatTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
  const { streamUrls } = useVideoManager();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="kiosk-root">
      {/* ── Header ── */}
      <header className="kiosk-header">
        <div className="header-brand">
          <div className="logo-circle">
            <span className="logo-text">กทม</span>
          </div>
          <span className="brand-name">กทม</span>
        </div>
        <div className="header-cols">
          <span className="col-label">ช่องบริการ</span>
          <span className="col-label">หมายเลขคิว</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="kiosk-body">
        {/* Left: video + clock */}
        <section className="left-panel">
          <div className="video-area">
            <VideoPlayer urls={streamUrls} />
          </div>
          <div className="clock-area">
            <div className="clock-date">{formatThaiDate(now)}</div>
            <div className="clock-time">{formatTime(now)}</div>
          </div>
        </section>

        {/* Right: queue table */}
        <section className="right-panel">
          {QUEUE_ROWS.map((row) => (
            <div className="queue-row" key={row.counter}>
              <div className="queue-cell counter">{row.counter}</div>
              <div className="queue-cell ticket">{row.ticket}</div>
            </div>
          ))}
        </section>
      </div>

      {/* ── Footer / Status ── */}
      <footer className="kiosk-footer">
        <span className="status-dot online" />
        <span className="status-label">ออนไลน์</span>
      </footer>
    </div>
  );
}

export default App;
