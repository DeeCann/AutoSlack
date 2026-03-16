import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, Loader2, CheckCircle2, Hash } from "lucide-react";

type QrPhase = "loading" | "ready" | "success" | "expired" | "error";

interface QrData {
  phase: QrPhase;
  token: string;
  loginUrl: string;
  errorMessage?: string;
}

const POLL_MS = 2000;

function SlackLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 54" className={className} fill="none">
      <path d="M19.7 40.3a4.5 4.5 0 0 1-4.5 4.5 4.5 4.5 0 0 1-4.5-4.5 4.5 4.5 0 0 1 4.5-4.5h4.5v4.5zm2.25 0a4.5 4.5 0 0 1 4.5-4.5 4.5 4.5 0 0 1 4.5 4.5v11.25a4.5 4.5 0 0 1-4.5 4.5 4.5 4.5 0 0 1-4.5-4.5V40.3z" fill="#E01E5A"/>
      <path d="M26.45 19.7a4.5 4.5 0 0 1-4.5-4.5 4.5 4.5 0 0 1 4.5-4.5 4.5 4.5 0 0 1 4.5 4.5v4.5h-4.5zm0 2.25a4.5 4.5 0 0 1 4.5 4.5 4.5 4.5 0 0 1-4.5 4.5H15.2a4.5 4.5 0 0 1-4.5-4.5 4.5 4.5 0 0 1 4.5-4.5h11.25z" fill="#36C5F0"/>
      <path d="M47.15 26.45a4.5 4.5 0 0 1 4.5 4.5 4.5 4.5 0 0 1-4.5 4.5h-4.5v-4.5a4.5 4.5 0 0 1 4.5-4.5zm-2.25 0a4.5 4.5 0 0 1-4.5 4.5 4.5 4.5 0 0 1-4.5-4.5V15.2a4.5 4.5 0 0 1 4.5-4.5 4.5 4.5 0 0 1 4.5 4.5v11.25z" fill="#2EB67D"/>
      <path d="M40.3 47.15a4.5 4.5 0 0 1-4.5 4.5 4.5 4.5 0 0 1-4.5-4.5v-4.5h4.5a4.5 4.5 0 0 1 4.5 4.5zm0-2.25a4.5 4.5 0 0 1-4.5-4.5 4.5 4.5 0 0 1 4.5-4.5h11.25a4.5 4.5 0 0 1 4.5 4.5 4.5 4.5 0 0 1-4.5 4.5H40.3z" fill="#ECB22E"/>
    </svg>
  );
}

export default function Login() {
  const [qr, setQr] = useState<QrData>({ phase: "loading", token: "", loginUrl: "" });
  const [dots, setDots] = useState(".");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startSession = useCallback(async () => {
    stopPolling();
    setQr({ phase: "loading", token: "", loginUrl: "" });

    try {
      const res = await fetch("/api/auth/qr-code");
      if (!res.ok) throw new Error();
      const { token, loginUrl } = (await res.json()) as { token: string; loginUrl: string };
      setQr({ phase: "ready", token, loginUrl });

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/auth/qr-status/${token}`);
          const data = (await r.json()) as { status: string; errorMessage?: string };

          if (data.status === "success") {
            stopPolling();
            setQr({ phase: "success", token, loginUrl });
            setTimeout(() => { window.location.href = import.meta.env.BASE_URL; }, 1200);
          } else if (data.status === "expired") {
            stopPolling();
            setQr({ phase: "expired", token, loginUrl });
          }
        } catch {
          // ignore transient network errors
        }
      }, POLL_MS);
    } catch {
      setQr({ phase: "error", token: "", loginUrl: "", errorMessage: "Nie można połączyć się z serwerem" });
    }
  }, []);

  useEffect(() => {
    startSession();
    return () => stopPolling();
  }, [startSession]);

  useEffect(() => {
    if (qr.phase !== "ready" && qr.phase !== "loading") return;
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 600);
    return () => clearInterval(t);
  }, [qr.phase]);

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden relative">
      <div className="hidden lg:flex lg:w-[55%] relative items-end">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4A154B] via-[#611F69] to-[#1a1d21] z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background z-10" />
        <div className="absolute inset-0 flex items-center justify-center z-5">
          <SlackLogo className="w-64 h-64 opacity-10" />
        </div>
        <div className="absolute bottom-16 left-16 z-20 flex items-center gap-4">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
            <Hash className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Slack Automotive</h2>
            <p className="text-white/70 text-xl font-medium">Twoja przestrzeń robocza w trasie.</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-12 md:px-20 py-12 relative z-20 bg-background/95 backdrop-blur-xl">
        <div className="flex lg:hidden items-center gap-4 mb-10 self-start">
          <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
            <Hash className="w-9 h-9 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Slack</h2>
        </div>

        <div className="w-full max-w-md flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-3">Połącz ze Slackiem</h1>
            <p className="text-xl text-muted-foreground">
              Zeskanuj kod telefonem, aby połączyć<br />swoją przestrzeń roboczą
            </p>
          </div>

          <div className="relative">
            <div className="w-72 h-72 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-black/50 overflow-hidden">
              {qr.phase === "loading" && (
                <div className="flex flex-col items-center gap-4 text-gray-600">
                  <Loader2 className="w-12 h-12 animate-spin text-[#4A154B]" />
                  <span className="text-lg font-medium text-gray-700">Generowanie kodu{dots}</span>
                </div>
              )}

              {qr.phase === "ready" && (
                <QRCodeSVG
                  value={qr.loginUrl}
                  size={240}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1d21"
                  includeMargin={false}
                />
              )}

              {qr.phase === "success" && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <span className="text-xl font-bold text-gray-800">Połączono!</span>
                </div>
              )}

              {(qr.phase === "expired" || qr.phase === "error") && (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <span className="text-5xl">{qr.phase === "expired" ? "⏱" : "⚠️"}</span>
                  <span className="text-gray-700 font-semibold text-lg">
                    {qr.phase === "expired" ? "Kod wygasł" : "Błąd połączenia"}
                  </span>
                  {qr.errorMessage && (
                    <span className="text-gray-500 text-sm">{qr.errorMessage}</span>
                  )}
                </div>
              )}
            </div>

            {qr.phase === "ready" && (
              <>
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg pointer-events-none" />
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg pointer-events-none" />
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg pointer-events-none" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg pointer-events-none" />
              </>
            )}
          </div>

          {qr.phase === "ready" && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-lg font-medium">Oczekiwanie na skan{dots}</span>
            </div>
          )}

          {qr.phase === "success" && (
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-xl font-semibold">Ładowanie przestrzeni roboczej…</span>
            </div>
          )}

          {(qr.phase === "expired" || qr.phase === "error") && (
            <button
              onClick={startSession}
              className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary text-white text-xl font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-6 h-6" />
              Wygeneruj nowy kod
            </button>
          )}

          {(qr.phase === "ready" || qr.phase === "loading") && (
            <div className="w-full space-y-3">
              {[
                "Otwórz aparat na swoim telefonie",
                "Skieruj go na kod QR powyżej",
                "Zaloguj się na stronie Slack",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-secondary/30">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-lg text-foreground">{step}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-base text-muted-foreground/60 font-medium">
            Zoptymalizowano dla Android Automotive OS
          </p>
        </div>
      </div>
    </div>
  );
}
