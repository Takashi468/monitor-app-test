import { useState, useEffect } from "react";
import { useVideoManager } from "./hooks/useVideoManager";
import { VideoPlayer } from "./components/VideoPlayer";
import "./App.css";
import packageJson from "../package.json";

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
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    return localStorage.getItem("api_base_url") || "http://10.1.60.222:3000";
  });
  const { streamUrls, isServerReachable } = useVideoManager(apiBaseUrl);
  const [now, setNow] = useState(new Date());

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiBaseUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleTestConnection = async () => {
    if (!tempApiUrl.trim()) return;
    setTestStatus('testing');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout
      const response = await fetch(`${tempApiUrl.trim()}/api/videos`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setTestStatus('error');
    }
  };

  const handleSaveSettings = () => {
    let cleanUrl = tempApiUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    localStorage.setItem('api_base_url', cleanUrl);
    setApiBaseUrl(cleanUrl);
    setIsSettingsOpen(false);
    setTestStatus('idle');
  };

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

      {/* ── Footer / Status & Version ── */}
      <footer className="absolute bottom-6 left-8 right-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="text-gray-800 text-base mr-1">สถานะ</span>
          <span className={`w-3.5 h-3.5 rounded-full ${isServerReachable ? 'bg-[#087754] shadow-[0_0_8px_rgba(8,119,84,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></span>
          <span className={isServerReachable ? 'text-[#087754]' : 'text-red-500'}>
            {isServerReachable ? 'ปกติ' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm font-medium tracking-wide">v{packageJson.version}</span>
          <button
            onClick={() => {
              setTempApiUrl(apiBaseUrl);
              setTestStatus('idle');
              setIsSettingsOpen(true);
            }}
            className="p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 shadow-sm text-gray-700 hover:text-gray-900 transition-all duration-200 active:scale-95 focus:outline-none cursor-pointer"
            title="ตั้งค่า API"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>
      </footer>

      {/* ── Settings Modal ── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all scale-100 flex flex-col font-['LINESeedSansTH'] mx-4">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">ตั้งค่าระบบ</h2>
            <p className="text-gray-500 mb-6 text-sm">กำหนดที่อยู่ของเซิร์ฟเวอร์ API เพื่อให้ดึงข้อมูลคิวและสตรีมวิดีโอได้อย่างถูกต้อง</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  URL เซิร์ฟเวอร์ API
                </label>
                <input
                  type="text"
                  value={tempApiUrl}
                  onChange={(e) => {
                    setTempApiUrl(e.target.value);
                    setTestStatus('idle');
                  }}
                  placeholder="เช่น http://10.1.60.222:3000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#087754] focus:border-transparent text-lg font-mono text-gray-900"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || !tempApiUrl.trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {testStatus === 'testing' ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                </button>

                {testStatus === 'success' && (
                  <span className="text-[#087754] text-sm font-bold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                    เชื่อมต่อสำเร็จ
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="text-red-500 text-sm font-bold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    เชื่อมต่อล้มเหลว
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setTestStatus('idle');
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 rounded-xl bg-[#087754] text-white font-semibold hover:bg-[#065c41] transition-colors cursor-pointer"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
