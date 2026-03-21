"use client";
import { useState, useRef, useEffect } from "react";
import type {
  Question, Diagnosis, DIYGuide, Contractor,
  NegotiatedQuote, OwnerInfo, TenantInfo, Booking,
} from "@/lib/types";

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ── Risk gauge ────────────────────────────────────────────────────────────────
function RiskGauge({ score }: { score: number }) {
  const displayed = useCountUp(score, 1000);
  const color = score >= 7 ? "var(--danger)" : score >= 4 ? "var(--warn)" : "var(--ok)";
  const trackColor = score >= 7 ? "var(--danger-border)" : score >= 4 ? "var(--warn-border)" : "var(--ok-border)";
  const label = score >= 7 ? "HIGH RISK" : score >= 4 ? "MODERATE" : "LOW RISK";
  return (
    <div style={{ textAlign: "center", minWidth: 110 }}>
      <div style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: -2 }}>
        {displayed}<span style={{ fontSize: 20, fontWeight: 500, color: "var(--muted)" }}>/10</span>
      </div>
      <div style={{ height: 5, background: trackColor, borderRadius: 99, margin: "10px 0 7px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(score / 10) * 100}%`, background: color, borderRadius: 99, transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <div className="mono" style={{ fontSize: 9, color, letterSpacing: 2, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function SavingsCount({ amount }: { amount: number }) {
  const displayed = useCountUp(amount, 1100);
  return (
    <span style={{ fontWeight: 900, fontSize: 38, color: "var(--ok)", lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
      ${displayed}
    </span>
  );
}

// ── Voice input ───────────────────────────────────────────────────────────────
function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const ref = useRef<any>(null);
  function start() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Edge."); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = "en-US";
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onresult = (e: any) => onResult(e.results[0][0].transcript);
    r.onerror = () => setListening(false);
    r.start(); ref.current = r;
  }
  function stop() { ref.current?.stop(); setListening(false); }
  return { listening, start, stop };
}

// ── Section reveal ────────────────────────────────────────────────────────────
function Section({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 120);
    }
  }, [visible]);
  return (
    <div ref={ref} style={{
      maxHeight: visible ? "4000px" : "0px",
      overflow: "hidden",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "max-height 0.55s ease, opacity 0.4s ease, transform 0.4s ease",
    }}>
      <div style={{ paddingTop: 24 }}>{children}</div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text", half = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; half?: boolean;
}) {
  return (
    <div style={{ flex: half ? "0 0 calc(50% - 6px)" : "1 1 100%" }}>
      <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} />
    </div>
  );
}

function Divider() { return <div style={{ height: 1, background: "var(--border)" }} />; }

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", background: disabled ? "var(--border)" : "var(--accent)",
      color: disabled ? "var(--muted)" : "var(--accent-text)", border: "none",
      borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
      boxShadow: disabled ? "none" : "0 2px 12px rgba(200,240,0,0.4)",
    }}>{children}</button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", background: "transparent", color: "var(--muted)",
      border: "1.5px solid var(--border)", borderRadius: 12, padding: "13px",
      fontSize: 14, fontWeight: 500, cursor: "pointer",
    }}>{children}</button>
  );
}

function MiniSpinner({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", color: "var(--muted)", fontSize: 13 }}>
      <div style={{ width: 16, height: 16, border: "2px solid var(--border)", borderTopColor: "var(--accent-dark)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
      {text}
    </div>
  );
}

// ── Swarm card ────────────────────────────────────────────────────────────────
function SwarmCard({
  contractor, quote, isBest, onBook, callsEnabled, index,
  conversationStatus, negotiatedPrice,
}: {
  contractor: Contractor;
  quote: NegotiatedQuote | null;
  isBest: boolean;
  onBook: () => void;
  callsEnabled: boolean;
  index: number;
  conversationStatus?: string;
  negotiatedPrice?: string | null;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (quote) {
      setTimeout(() => setRevealed(true), index * 700);
    }
  }, [quote, index]);

  const isResolved = quote && revealed;
  const isOnCall = !isResolved && callsEnabled;
  const actualPrice = negotiatedPrice && negotiatedPrice !== "No agreement"
    ? negotiatedPrice
    : isResolved ? `$${quote!.negotiatedMin}–$${quote!.negotiatedMax}` : null;

  return (
    <div style={{
      background: isResolved && isBest ? "rgba(200,240,0,0.04)" : "var(--surface)",
      border: `2px solid ${isResolved && isBest ? "var(--accent-dark)" : "var(--border)"}`,
      borderRadius: 16, overflow: "hidden",
      boxShadow: isResolved && isBest ? "0 4px 20px rgba(200,240,0,0.15)" : "var(--shadow-sm)",
      transition: "all 0.4s ease",
    }}>
      {isResolved && isBest && (
        <div style={{ background: "var(--accent)", color: "var(--accent-text)", textAlign: "center", padding: "6px", fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }} className="mono">
          ⚡ BEST DEAL
        </div>
      )}
      <div style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{contractor.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>⭐ {contractor.rating} · {contractor.distanceMi} mi</div>
            {callsEnabled && conversationStatus && (
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, letterSpacing: 1 }}>
                {conversationStatus === "done" ? "✓ CALL COMPLETE" : conversationStatus === "in-progress" ? "● IN CALL" : ""}
              </div>
            )}
          </div>

          {!isResolved ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>${contractor.estimateMin}–${contractor.estimateMax}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, background: "var(--accent-dark)", borderRadius: "50%", animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--accent-dark)", fontWeight: 600 }}>
                  {isOnCall ? "on call..." : "negotiating..."}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", marginBottom: 2 }}>
                ${quote!.originalMin}–${quote!.originalMax}
              </div>
              <div style={{ fontWeight: 900, fontSize: 24, color: isBest ? "var(--accent-dark)" : "var(--ok)", letterSpacing: -1, lineHeight: 1 }}>
                {actualPrice ?? `$${quote!.negotiatedMin}–$${quote!.negotiatedMax}`}
              </div>
              {quote!.saved > 0 && (
                <div style={{ fontSize: 11, color: "var(--ok)", fontWeight: 700, marginTop: 2 }}>saved ${quote!.saved}</div>
              )}
            </div>
          )}
        </div>

        {isResolved && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", background: "var(--surface-2)", borderRadius: 9, padding: "10px 14px", marginBottom: 12, lineHeight: 1.6, border: "1px solid var(--border)" }}>
              💬 "{quote!.negotiationNote}"
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>🕐 {quote!.availability}</div>
            <button onClick={onBook} style={{
              width: "100%",
              background: isBest ? "var(--accent)" : "transparent",
              border: `1.5px solid ${isBest ? "var(--accent-dark)" : "var(--border)"}`,
              color: isBest ? "var(--accent-text)" : "var(--text)",
              borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: isBest ? "0 2px 12px rgba(200,240,0,0.35)" : "none",
            }}>
              Book {contractor.name.split(" ")[0]} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
export default function BidBot() {
  const [issue, setIssue] = useState("");
  const [owner, setOwner] = useState<OwnerInfo>({ name: "", phone: "", address: "", zip: "", unit: "" });
  const [tenant, setTenant] = useState<TenantInfo>({ name: "", phone: "" });
  const [budget, setBudget] = useState("");
  const [enableCalls, setEnableCalls] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [diyGuide, setDiyGuide] = useState<DIYGuide | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quotes, setQuotes] = useState<NegotiatedQuote[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  // Call status per conversation ID
  const [conversationStatuses, setConversationStatuses] = useState<Record<string, string>>({});
  const [negotiatedPrices, setNegotiatedPrices] = useState<Record<string, string>>({});

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [loadingDIY, setLoadingDIY] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingNegotiate, setLoadingNegotiate] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [negotiatingContractors, setNegotiatingContractors] = useState<Contractor[]>([]);

  const showQuestions = questions.length > 0;
  const showDiagnosis = !!diagnosis;
  const showChoice = showDiagnosis && !diyGuide && contractors.length === 0 && !booking && !loadingDIY && !loadingShops;
  const showDIY = !!diyGuide;
  const showContractors = contractors.length > 0 && !booking && negotiatingContractors.length === 0 && quotes.length === 0;
  const showSwarm = negotiatingContractors.length > 0 || (quotes.length > 0 && !booking);
  const showBooked = !!booking;

  const voice = useVoiceInput(text => setIssue(prev => prev ? prev + " " + text : text));
  const ownerValid = !!(owner.name && owner.phone && owner.address && owner.zip && issue.trim());
  const allAnswered = questions.length > 0 && Object.keys(answers).length >= questions.length;
  const allSelected = contractors.length > 0 && selected.size === contractors.length;
  const bestQuote = quotes.length ? [...quotes].sort((a, b) => a.negotiatedMin - b.negotiatedMin)[0] : null;
  const totalSaved = quotes.reduce((s, q) => s + (q.saved || 0), 0);

  const urgencyConfig = diagnosis ? {
    low:    { color: "var(--ok)",     bg: "var(--ok-bg)",     border: "var(--ok-border)" },
    medium: { color: "var(--warn)",   bg: "var(--warn-bg)",   border: "var(--warn-border)" },
    high:   { color: "var(--danger)", bg: "var(--danger-bg)", border: "var(--danger-border)" },
  }[diagnosis.urgency] : null;

  const difficultyConfig = diyGuide ? {
    Easy:   { color: "var(--ok)",   bg: "var(--ok-bg)" },
    Medium: { color: "var(--warn)", bg: "var(--warn-bg)" },
    Hard:   { color: "var(--danger)", bg: "var(--danger-bg)" },
  }[diyGuide.difficulty] : null;

  // ── Log to Sheets helper (fire and forget) ────────────────────────────────
  function logToSheets(type: string, data: object) {
    fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    }).catch(() => {}); // non-fatal
  }

  // ── Poll conversation status for real calls ───────────────────────────────
  function pollConversation(conversationId: string, contractorId: string) {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversation?id=${conversationId}`);
        const data = await res.json();
        setConversationStatuses(prev => ({ ...prev, [contractorId]: data.status }));
        if (data.negotiatedPrice) {
          setNegotiatedPrices(prev => ({ ...prev, [contractorId]: data.negotiatedPrice }));
        }
        if (data.status === "done" || data.status === "error") {
          clearInterval(interval);
        }
      } catch { clearInterval(interval); }
    }, 6000); // poll every 6 seconds
  }

  async function handleSubmitIssue() {
    if (!ownerValid) return;
    setError(""); setLoadingQuestions(true); setQuestions([]);
    setDiagnosis(null); setDiyGuide(null); setContractors([]);
    setSelected(new Set()); setQuotes([]); setBooking(null);
    setAnswers({}); setNegotiatingContractors([]);

    // Log submission to Sheets
    logToSheets("submission", {
      ownerName: owner.name, ownerPhone: owner.phone,
      address: owner.address, zip: owner.zip, unit: owner.unit ?? "",
      tenantName: tenant.name, tenantPhone: tenant.phone,
      issue, budget: parseInt(budget) || 0,
    });

    try {
      const res = await fetch("/api/questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (e: any) { setError(e.message); }
    finally { setLoadingQuestions(false); }
  }

  async function handleSubmitAnswers() {
    setError(""); setLoadingDiagnosis(true); setDiagnosis(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDiagnosis(data);

      // Log diagnosis to Sheets
      logToSheets("diagnosis", {
        ownerName: owner.name, zip: owner.zip, issue,
        diagnosedIssue: data.issue, tradeType: data.tradeType,
        urgency: data.urgency, estimateMin: data.estimateMin,
        estimateMax: data.estimateMax, riskScore: data.riskScore,
        isDIYable: data.isDIYable,
      });
    } catch (e: any) { setError(e.message); }
    finally { setLoadingDiagnosis(false); }
  }

  async function handleDIY() {
    setError(""); setLoadingDIY(true);
    try {
      const res = await fetch("/api/diy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue, diagnosis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDiyGuide(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoadingDIY(false); }
  }

  async function handleBookContractor() {
    if (!diagnosis) return;
    setError(""); setLoadingShops(true); setContractors([]); setDiyGuide(null);
    try {
      const res = await fetch("/api/shops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeType: diagnosis.tradeType, zip: owner.zip, estimateMin: diagnosis.estimateMin, estimateMax: diagnosis.estimateMax }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const list = Array.isArray(data.contractors) ? data.contractors : [];
      setContractors(list);

      // Log contractors to Sheets
      logToSheets("contractors", {
        zip: owner.zip, tradeType: diagnosis.tradeType,
        contractors: list.map((c: Contractor) => ({
          name: c.name, phone: c.phone, rating: c.rating,
          address: c.address, estimateMin: c.estimateMin, estimateMax: c.estimateMax,
        })),
      });
    } catch (e: any) { setError(e.message); }
    finally { setLoadingShops(false); }
  }

  async function handleNegotiate() {
    if (!diagnosis) return;
    const sel = contractors.filter(c => selected.has(c.id));
    setNegotiatingContractors(sel);
    setError(""); setLoadingNegotiate(true); setQuotes([]);
    try {
      const res = await fetch("/api/negotiate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractors: sel, issue, budget: parseInt(budget) || 0,
          tradeType: diagnosis.tradeType, zip: owner.zip,
          ownerName: owner.name, enableCalls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const resultQuotes = Array.isArray(data.quotes) ? data.quotes : [];
      setQuotes(resultQuotes);

      // Start polling for real call statuses
      if (enableCalls) {
        resultQuotes.forEach((q: NegotiatedQuote & { conversationId?: string }) => {
          if (q.conversationId) {
            pollConversation(q.conversationId, q.contractorId);
          }
        });
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoadingNegotiate(false); }
  }

  function handleBook(quote: NegotiatedQuote) {
    const contractor = negotiatingContractors.find(c => c.id === quote.contractorId)
      || contractors.find(c => c.id === quote.contractorId);
    setLoadingBooking(true);
    setTimeout(() => {
      setBooking({
        contractorName: quote.contractorName,
        contractorPhone: contractor?.phone ?? "N/A",
        arrivalTime: quote.availability,
        estimatedCost: Math.round((quote.negotiatedMin + quote.negotiatedMax) / 2),
        address: `${owner.address}${owner.unit ? `, Unit ${owner.unit}` : ""}, ${owner.zip}`,
        tenantName: tenant.name || undefined,
        tenantPhone: tenant.phone || undefined,
      });
      setLoadingBooking(false);
    }, 1800);
  }

  function reset() {
    setIssue(""); setBudget("");
    setOwner({ name: "", phone: "", address: "", zip: "", unit: "" });
    setTenant({ name: "", phone: "" });
    setQuestions([]); setAnswers({}); setDiagnosis(null);
    setDiyGuide(null); setContractors([]); setSelected(new Set());
    setNegotiatingContractors([]); setQuotes([]); setBooking(null); setError("");
    setConversationStatuses({}); setNegotiatedPrices({});
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Nav ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,244,240,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", padding: "0 32px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 2px 8px rgba(200,240,0,0.35)" }}>⚒️</div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>BidBot</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setEnableCalls(p => !p)} style={{
              background: enableCalls ? "var(--ok-bg)" : "transparent",
              border: `1.5px solid ${enableCalls ? "var(--ok)" : "var(--border)"}`,
              borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 600,
              color: enableCalls ? "var(--ok)" : "var(--muted)", cursor: "pointer",
            }} className="mono">
              {enableCalls ? "📞 CALLS ON" : "📞 CALLS OFF"}
            </button>
            <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5 }}>AI REPAIR AGENT</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 32px 120px" }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ background: "var(--accent)", color: "var(--accent-text)", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700 }} className="mono">NEW</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>AI negotiation swarm for property repairs</span>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.15, marginBottom: 14 }}>
            Fix it fast.<br />
            <span style={{ color: "var(--accent-dark)" }}>Pay the least.</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, maxWidth: 460 }}>
            Describe your repair issue. BidBot deploys an AI calling swarm to negotiate with every contractor simultaneously and books the winner.
          </p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 10, padding: "12px 16px", color: "var(--danger)", fontSize: 13, marginBottom: 20, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        {/* ══ BLOCK 1: ISSUE + OWNER ══ */}
        <Card>
          <div style={{ padding: "24px 26px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, marginBottom: 12, fontWeight: 500 }}>DESCRIBE THE ISSUE *</div>
            <div style={{ position: "relative" }}>
              <textarea value={issue} onChange={e => setIssue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && ownerValid) { e.preventDefault(); handleSubmitIssue(); } }}
                placeholder="e.g. Water leaking under the kitchen sink since this morning..." rows={2}
                style={{ border: "none", boxShadow: "none", borderBottom: "1.5px solid var(--border)", borderRadius: 0, background: "transparent", padding: "6px 48px 12px 0", fontSize: 15, fontWeight: 500 }} />
              <button onClick={voice.listening ? voice.stop : voice.start}
                style={{ position: "absolute", right: 0, top: 4, background: voice.listening ? "var(--danger)" : "var(--surface-2)", border: `1.5px solid ${voice.listening ? "var(--danger)" : "var(--border)"}`, borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: voice.listening ? "white" : "var(--text)" }}>
                {voice.listening ? "⏹" : "🎙"}
              </button>
            </div>
            {voice.listening && <div className="mono" style={{ fontSize: 9, color: "var(--danger)", letterSpacing: 2, marginTop: 8, fontWeight: 600 }}>● LISTENING...</div>}
          </div>
          <Divider />
          <div style={{ padding: "20px 26px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, marginBottom: 14, fontWeight: 500 }}>OWNER INFO</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
              <Field label="FULL NAME" value={owner.name} onChange={v => setOwner(p => ({ ...p, name: v }))} placeholder="Jane Smith" half />
              <Field label="PHONE" value={owner.phone} onChange={v => setOwner(p => ({ ...p, phone: v }))} placeholder="(555) 000-0000" type="tel" half />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Field label="PROPERTY ADDRESS" value={owner.address} onChange={v => setOwner(p => ({ ...p, address: v }))} placeholder="1234 Main St, Hayward, CA" />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Field label="ZIP CODE" value={owner.zip} onChange={v => setOwner(p => ({ ...p, zip: v }))} placeholder="94542" half />
              <Field label="UNIT (OPTIONAL)" value={owner.unit ?? ""} onChange={v => setOwner(p => ({ ...p, unit: v }))} placeholder="Unit 4B" half />
            </div>
          </div>
          <Divider />
          <div style={{ padding: "20px 26px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, marginBottom: 14, fontWeight: 500 }}>TENANT & BUDGET <span style={{ opacity: 0.5, fontFamily: "inherit", textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Field label="TENANT NAME" value={tenant.name} onChange={v => setTenant(p => ({ ...p, name: v }))} placeholder="John Doe" half />
              <Field label="TENANT PHONE" value={tenant.phone} onChange={v => setTenant(p => ({ ...p, phone: v }))} placeholder="(555) 000-0000" type="tel" half />
              <Field label="MAX BUDGET $" value={budget} onChange={setBudget} placeholder="e.g. 300" type="number" half />
            </div>
          </div>
          <Divider />
          <div style={{ padding: "18px 26px" }}>
            {loadingQuestions ? <MiniSpinner text="Generating questions..." /> : <PrimaryBtn onClick={handleSubmitIssue} disabled={!ownerValid}>Diagnose Issue →</PrimaryBtn>}
          </div>
        </Card>

        {/* ══ BLOCK 2: QUESTIONS ══ */}
        <Section visible={showQuestions}>
          <Card>
            <div style={{ padding: "22px 26px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>A couple quick questions</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Helps BidBot diagnose accurately</div>
            </div>
            {questions.map((q, qi) => (
              <div key={q.id}>
                <Divider />
                <div style={{ padding: "18px 26px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-2)" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2, marginRight: 8 }}>Q{qi + 1}</span>{q.text}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {q.options.map(opt => {
                      const sel = answers[q.text] === opt;
                      return (
                        <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.text]: opt }))}
                          style={{ background: sel ? "var(--accent)" : "var(--surface-2)", border: `1.5px solid ${sel ? "var(--accent-dark)" : "var(--border)"}`, borderRadius: 10, padding: "9px 16px", color: sel ? "var(--accent-text)" : "var(--text-2)", fontSize: 13, fontWeight: sel ? 700 : 500, cursor: "pointer", boxShadow: sel ? "0 2px 8px rgba(200,240,0,0.3)" : "none" }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            <Divider />
            <div style={{ padding: "18px 26px" }}>
              {loadingDiagnosis ? <MiniSpinner text="Diagnosing your issue..." /> : <PrimaryBtn onClick={handleSubmitAnswers} disabled={!allAnswered}>Get Diagnosis →</PrimaryBtn>}
            </div>
          </Card>
        </Section>

        {/* ══ BLOCK 3: DIAGNOSIS ══ */}
        <Section visible={showDiagnosis}>
          {diagnosis && urgencyConfig && (
            <div style={{ background: urgencyConfig.bg, border: `1.5px solid ${urgencyConfig.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ padding: "22px 26px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, fontWeight: 500 }}>AI DIAGNOSIS</div>
                      <span className="mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: urgencyConfig.color, background: urgencyConfig.border, borderRadius: 99, padding: "3px 8px" }}>{diagnosis.urgency.toUpperCase()}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 21, marginBottom: 18, textTransform: "capitalize", letterSpacing: -0.5, lineHeight: 1.2 }}>{diagnosis.issue}</div>
                    <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2, marginBottom: 4, fontWeight: 500 }}>TRADE</div>
                        <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{diagnosis.tradeType}</div>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2, marginBottom: 4, fontWeight: 500 }}>ESTIMATE</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: "var(--accent-dark)", letterSpacing: -0.5 }}>${diagnosis.estimateMin}–${diagnosis.estimateMax}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "var(--surface)", borderRadius: 14, padding: "16px 20px", boxShadow: "var(--shadow-sm)", flexShrink: 0 }}>
                    <RiskGauge score={diagnosis.riskScore} />
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 26px 14px", borderTop: `1px solid ${urgencyConfig.border}`, background: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.6 }}>⚠ {diagnosis.riskIfIgnored}</div>
              </div>
            </div>
          )}
        </Section>

        {/* ══ BLOCK 4: CHOICE ══ */}
        <Section visible={showChoice}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, letterSpacing: -0.3 }}>How do you want to handle this?</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Choose your path forward</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <button onClick={handleDIY}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "26px 22px", textAlign: "left", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ok)"; e.currentTarget.style.boxShadow = "var(--shadow), 0 0 0 3px var(--ok-border)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
              <div style={{ width: 52, height: 52, background: "var(--ok-bg)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16, border: "1px solid var(--ok-border)" }}>🔧</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, letterSpacing: -0.3 }}>Fix It Myself</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>Supplies list, difficulty, step-by-step guide, and safety warnings.</div>
              {diagnosis && !diagnosis.isDIYable && (
                <div style={{ marginTop: 12, fontSize: 11, color: "var(--warn)", fontWeight: 600, background: "var(--warn-bg)", borderRadius: 6, padding: "4px 9px", display: "inline-block", border: "1px solid var(--warn-border)" }}>⚠ Pro recommended</div>
              )}
            </button>
            <button onClick={handleBookContractor}
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "26px 22px", textAlign: "left", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-dark)"; e.currentTarget.style.boxShadow = "var(--shadow), 0 0 0 3px rgba(200,240,0,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
              <div style={{ width: 52, height: 52, background: "rgba(200,240,0,0.12)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16, border: "1px solid rgba(200,240,0,0.3)" }}>📞</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, letterSpacing: -0.3 }}>Deploy Negotiation Swarm</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>BidBot calls every contractor simultaneously, negotiates each one, books the winner.</div>
            </button>
          </div>
          {(loadingDIY || loadingShops) && (
            <div style={{ marginTop: 16 }}>
              <MiniSpinner text={loadingDIY ? "Generating your DIY guide..." : `Finding nearby ${diagnosis?.tradeType}s...`} />
            </div>
          )}
        </Section>

        {/* ══ BLOCK 5: DIY GUIDE ══ */}
        <Section visible={showDIY}>
          {diyGuide && difficultyConfig && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label: "DIFFICULTY", value: diyGuide.difficulty, color: difficultyConfig.color, bg: difficultyConfig.bg },
                  { label: "TIME", value: diyGuide.timeEstimate, color: "var(--text)", bg: "var(--surface)" },
                  { label: "TOTAL COST", value: `$${diyGuide.totalCost}`, color: "var(--ok)", bg: "var(--ok-bg)" },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, border: "1px solid var(--border)", borderRadius: 14, padding: "18px 16px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
                    <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2, marginBottom: 8, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <Card>
                <div style={{ padding: "18px 24px" }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, marginBottom: 16, fontWeight: 500 }}>SUPPLIES NEEDED</div>
                  {diyGuide.supplies.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < diyGuide.supplies.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.item}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>📍 {s.where}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: s.estimatedCost === 0 ? "var(--muted)" : "var(--ok)" }}>
                        {s.estimatedCost === 0 ? "Free" : `$${s.estimatedCost}`}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "14px 24px", borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--ok-bg)" }}>
                  <div style={{ fontWeight: 700 }}>Total supplies</div>
                  <div style={{ fontWeight: 900, fontSize: 22, color: "var(--ok)" }}>${diyGuide.totalCost}</div>
                </div>
              </Card>
              <Card>
                <div style={{ padding: "18px 24px" }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, marginBottom: 16, fontWeight: 500 }}>STEP-BY-STEP</div>
                  {diyGuide.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: i < diyGuide.steps.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ minWidth: 28, height: 28, background: "var(--accent)", color: "var(--accent-text)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0, marginTop: 1, boxShadow: "0 2px 6px rgba(200,240,0,0.3)" }}>{i + 1}</div>
                      <div style={{ fontSize: 14, lineHeight: 1.7, paddingTop: 4, color: "var(--text-2)" }}>{step}</div>
                    </div>
                  ))}
                </div>
              </Card>
              {diyGuide.safetyWarnings.length > 0 && (
                <div style={{ background: "var(--warn-bg)", border: "1.5px solid var(--warn-border)", borderRadius: 16, padding: "18px 24px" }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--warn)", letterSpacing: 2.5, marginBottom: 12, fontWeight: 600 }}>⚠ SAFETY</div>
                  {diyGuide.safetyWarnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--warn)", marginBottom: 8, lineHeight: 1.6, display: "flex", gap: 8, fontWeight: 500 }}><span>•</span><span>{w}</span></div>
                  ))}
                </div>
              )}
              <div style={{ background: "var(--danger-bg)", border: "1.5px solid var(--danger-border)", borderRadius: 16, padding: "18px 24px" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--danger)", letterSpacing: 2.5, marginBottom: 10, fontWeight: 600 }}>WHEN TO CALL A PRO</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 16 }}>{diyGuide.whenToCallPro}</div>
                <GhostBtn onClick={handleBookContractor}>Deploy negotiation swarm instead →</GhostBtn>
              </div>
              <GhostBtn onClick={reset}>← Start Over</GhostBtn>
            </div>
          )}
        </Section>

        {/* ══ BLOCK 6: CONTRACTOR SELECTION ══ */}
        <Section visible={showContractors}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 3, letterSpacing: -0.3 }}>Select contractors for the swarm</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {enableCalls ? "BidBot will call all selected contractors simultaneously" : "BidBot will negotiate with all selected contractors simultaneously"}
              </div>
            </div>
            <button onClick={() => setSelected(allSelected ? new Set() : new Set(contractors.map(c => c.id)))}
              style={{ background: "transparent", border: "1.5px solid var(--border)", borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: allSelected ? "var(--accent-dark)" : "var(--muted)", cursor: "pointer", flexShrink: 0 }}>
              {allSelected ? "✓ All" : "Select all"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {contractors.map(c => {
              const isSelected = selected.has(c.id);
              const overBudget = budget && c.estimateMin > parseInt(budget);
              return (
                <div key={c.id} onClick={() => setSelected(prev => { const n = new Set(prev); isSelected ? n.delete(c.id) : n.add(c.id); return n; })}
                  style={{ background: isSelected ? "rgba(200,240,0,0.06)" : "var(--surface)", border: `1.5px solid ${isSelected ? "var(--accent-dark)" : "var(--border)"}`, borderRadius: 14, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, boxShadow: isSelected ? "0 0 0 3px rgba(200,240,0,0.15)" : "var(--shadow-sm)" }}>
                  <div style={{ width: 20, height: 20, flexShrink: 0, border: `2px solid ${isSelected ? "var(--accent-dark)" : "var(--border-strong)"}`, borderRadius: 5, background: isSelected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isSelected && <span style={{ color: "var(--accent-text)", fontSize: 12, fontWeight: 900 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>⭐ {c.rating} · {c.distanceMi} mi · {c.address}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: overBudget ? "var(--danger)" : "var(--text)" }}>${c.estimateMin}–${c.estimateMax}</div>
                    {overBudget && <div style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600, marginTop: 2 }}>over budget</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {loadingNegotiate
            ? <MiniSpinner text={enableCalls ? "Deploying call swarm..." : "Negotiating with all contractors..."} />
            : <PrimaryBtn onClick={handleNegotiate} disabled={selected.size === 0}>
                {enableCalls
                  ? `📞 Call ${selected.size} Contractor${selected.size !== 1 ? "s" : ""} Simultaneously →`
                  : `⚡ Negotiate with ${selected.size} Contractor${selected.size !== 1 ? "s" : ""} →`}
              </PrimaryBtn>
          }
        </Section>

        {/* ══ BLOCK 7: SWARM ══ */}
        <Section visible={showSwarm}>
          {negotiatingContractors.length > 0 && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4, letterSpacing: -0.3 }}>
                  {enableCalls ? "📞 Swarm deployed — calls active" : "⚡ Negotiation swarm active"}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {enableCalls
                    ? `Calling all ${negotiatingContractors.length} contractors simultaneously via ElevenLabs AI`
                    : `Negotiating with all ${negotiatingContractors.length} contractors in parallel`}
                </div>
              </div>

              {quotes.length > 0 && totalSaved > 0 && (
                <div style={{ background: "var(--ok-bg)", border: "1.5px solid var(--ok-border)", borderRadius: 16, padding: "18px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "var(--shadow-sm)" }}>
                  <div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ok)", letterSpacing: 2.5, marginBottom: 6, fontWeight: 600 }}>SWARM COMPLETE ✓</div>
                    <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 500 }}>Best deal secured across all contractors</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Total savings</div>
                    <SavingsCount amount={totalSaved} />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {negotiatingContractors.map((contractor, i) => {
                  const quote = quotes.find(q => q.contractorId === contractor.id) ?? null;
                  const isBest = quote && bestQuote?.contractorId === quote.contractorId;
                  const convId = (quote as any)?.conversationId;
                  return (
                    <SwarmCard
                      key={contractor.id}
                      contractor={contractor}
                      quote={quote}
                      isBest={!!isBest}
                      onBook={() => quote && handleBook(quote)}
                      callsEnabled={enableCalls}
                      index={i}
                      conversationStatus={convId ? conversationStatuses[contractor.id] : undefined}
                      negotiatedPrice={convId ? negotiatedPrices[contractor.id] : undefined}
                    />
                  );
                })}
              </div>
            </>
          )}
        </Section>

        {/* ══ BLOCK 8: BOOKED ══ */}
        <Section visible={showBooked}>
          {booking && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "var(--ok-bg)", border: "2px solid var(--ok-border)", borderRadius: 18, padding: "36px 28px", textAlign: "center", boxShadow: "var(--shadow)" }}>
                <div style={{ width: 64, height: 64, background: "var(--ok)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 16px", boxShadow: "0 4px 20px rgba(5,150,105,0.3)", color: "white" }}>✓</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6, letterSpacing: -0.5 }}>Appointment Confirmed</div>
                <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>Your repair is scheduled</div>
              </div>
              <Card>
                <div style={{ padding: "22px 26px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {[
                      { label: "CONTRACTOR", value: booking.contractorName },
                      { label: "PHONE", value: booking.contractorPhone },
                      { label: "ARRIVAL", value: booking.arrivalTime },
                      { label: "TOTAL COST", value: `$${booking.estimatedCost}`, color: "var(--ok)" },
                      { label: "PROPERTY", value: booking.address },
                      { label: "STATUS", value: "Confirmed ✓", color: "var(--ok)" },
                    ].map(s => (
                      <div key={s.label}>
                        <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2, marginBottom: 5, fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: s.color ?? "var(--text)" }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              {(booking.tenantName || booking.tenantPhone) && (
                <Card>
                  <div style={{ padding: "20px 26px" }}>
                    <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2.5, marginBottom: 14, fontWeight: 500 }}>📱 TENANT SMS SENT</div>
                    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", fontSize: 13, lineHeight: 1.8, color: "var(--text-2)" }}>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>To: {booking.tenantName} ({booking.tenantPhone})</span><br />
                      Hi {booking.tenantName}, a repair has been scheduled at your unit.<br />
                      Contractor: <strong style={{ color: "var(--text)" }}>{booking.contractorName}</strong> · Arrival: <strong style={{ color: "var(--text)" }}>{booking.arrivalTime}</strong><br />
                      Est. cost: <strong style={{ color: "var(--text)" }}>${booking.estimatedCost}</strong>
                    </div>
                  </div>
                </Card>
              )}
              <GhostBtn onClick={reset}>← New Issue</GhostBtn>
            </div>
          )}
        </Section>

      </div>
    </main>
  );
}