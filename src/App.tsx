import { useState, useEffect } from "react";
import { useVideoManager } from "./hooks/useVideoManager";
import { VideoPlayer } from "./components/VideoPlayer";
import "./App.css";

// ─── Queue rows (placeholder data – replace with real API if needed) ───────────
const QUEUE_ROWS = [
  { counter: "1", ticket: "A001" },
  { counter: "2", ticket: "A015" },
  { counter: "3", ticket: "B003" },
  { counter: "4", ticket: "A022" },
  { counter: "5", ticket: "C007" },
  { counter: "6", ticket: "D099" },
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
    <div className="w-screen h-screen bg-[#F5F5F5] flex flex-col p-8 relative overflow-hidden font-['LINESeedSansTH']">

      {/* ── Header ── */}
      <header className="flex w-full mb-6 items-end">
        {/* Brand (Left) */}
        <div className="w-[55%] flex items-center gap-4 pl-2">
          {/* <div className="w-20 h-20 rounded-full border-[3px] border-[#0f7649] flex items-center justify-center bg-white shadow-sm overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#0f7649] fill-current">
              <path d="M50 15 L85 85 L15 85 Z" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
              <circle cx="50" cy="60" r="10" />
            </svg>
          </div> */}
          <h1 className="text-7xl font-extrabold text-[#0f7649] tracking-tight pt-2">กทม</h1>
        </div>

        {/* Columns Labels (Right) */}
        <div className="w-[45%] flex gap-3">
          <div className="w-[35%] text-center text-3xl font-bold text-gray-800">ช่องบริการ</div>
          <div className="w-[65%] text-center text-3xl font-bold text-gray-800">หมายเลขคิว</div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex w-full flex-1 gap-8">

        {/* Left: video + clock */}
        <section className="w-[55%] flex flex-col">
          {/* Video Area */}
          <div className="w-full bg-black rounded-3xl shadow-xl aspect-video overflow-hidden relative border-4 border-black">
            <VideoPlayer urls={streamUrls} />
          </div>

          {/* Clock Area */}
          <div className="flex-1 flex flex-col items-center justify-center mt-4">
            <div className="text-4xl font-bold text-gray-800 mb-2">{formatThaiDate(now)}</div>
            <div className="text-[6.5rem] leading-none font-extrabold text-black tracking-widest">{formatTime(now)}</div>
          </div>
        </section>

        {/* Right: queue table */}
        <section className="w-[45%] flex flex-col gap-4 pb-12">
          {QUEUE_ROWS.map((row, index) => (
            <div key={index} className="flex flex-1 gap-3">
              {/* Counter Cell */}
              <div className="w-[35%] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-5xl font-bold text-gray-800">
                {row.counter}
              </div>
              {/* Ticket Cell */}
              <div className="w-[65%] bg-[#087754] rounded-2xl shadow-md flex items-center justify-center text-7xl font-bold text-white tracking-widest">
                {row.ticket}
              </div>
            </div>
          ))}
        </section>

      </main>

      {/* ── Footer / Status ── */}
      <footer className="absolute bottom-6 left-8 flex items-center gap-2 text-xl font-bold">
        <span className="text-gray-800 text-base mr-1">สถานะ</span>
        <span className="w-3.5 h-3.5 rounded-full bg-[#087754] shadow-[0_0_8px_rgba(8,119,84,0.6)]"></span>
        <span className="text-[#087754]">ปกติ</span>
      </footer>

    </div>
  );
}

export default App;
