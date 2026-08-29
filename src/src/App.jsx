import { useState, useMemo } from "react";

// ─── Colour tokens ────────────────────────────────────────────────────────────
// Deep navy background, slate surface, electric-blue accent, charcoal card
const C = {
  bg:      "#0a0e1a",
  surface: "#111827",
  card:    "#1a2235",
  border:  "#1e2d45",
  accent:  "#3b82f6",
  accentL: "#60a5fa",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  text:    "#f1f5f9",
  muted:   "#64748b",
  subtle:  "#334155",
};

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_TRADES = [
  { id:1, date:"2026-08-01", pair:"XAUUSD", session:"London Open",    setup:"Fair Value Gap",    direction:"Buy",  entry:2410.50, sl:2405.00, tp:2421.00, lots:0.10, result:"Win",  pips:105, rr:1.9, pnl:105,  bias:"Bullish", killzone:true,  confluences:3, emotion:"Confident", notes:"Clean FVG retest at London open, strong bullish structure." },
  { id:2, date:"2026-08-04", pair:"XAUUSD", session:"New York Open",   setup:"Order Block",       direction:"Sell", entry:2435.00, sl:2440.00, tp:2420.00, lots:0.10, result:"Win",  pips:150, rr:3.0, pnl:150,  bias:"Bearish", killzone:true,  confluences:4, emotion:"Patient",   notes:"Bearish OB with liquidity sweep above. Perfect entry." },
  { id:3, date:"2026-08-05", pair:"USOIL",  session:"New York Open",   setup:"Break of Structure",direction:"Buy",  entry:77.20,   sl:76.80,   tp:78.00,   lots:0.50, result:"Loss", pips:-40, rr:-1.0,pnl:-40,  bias:"Bullish", killzone:false, confluences:2, emotion:"Rushed",    notes:"Entered before killzone. Lesson learned." },
  { id:4, date:"2026-08-07", pair:"GBPUSD", session:"London Open",    setup:"Liquidity Sweep",   direction:"Buy",  entry:1.2750,  sl:1.2730,  tp:1.2800,  lots:1.00, result:"Win",  pips:50,  rr:2.5, pnl:500,  bias:"Bullish", killzone:true,  confluences:3, emotion:"Confident", notes:"Swept buy side liquidity then reversed beautifully." },
  { id:5, date:"2026-08-11", pair:"XAUUSD", session:"London Open",    setup:"Fair Value Gap",    direction:"Sell", entry:2450.00, sl:2455.00, tp:2435.00, lots:0.10, result:"Win",  pips:150, rr:3.0, pnl:150,  bias:"Bearish", killzone:true,  confluences:4, emotion:"Patient",   notes:"HTF FVG with confluence from daily OB. Textbook." },
  { id:6, date:"2026-08-13", pair:"XAUUSD", session:"New York Open",   setup:"Order Block",       direction:"Buy",  entry:2438.00, sl:2433.00, tp:2453.00, lots:0.10, result:"Loss", pips:-50, rr:-1.0,pnl:-50,  bias:"Bullish", killzone:true,  confluences:2, emotion:"Anxious",   notes:"Stopped out at the lows. Market swept then continued." },
  { id:7, date:"2026-08-15", pair:"USOIL",  session:"London Open",    setup:"Breaker Block",     direction:"Sell", entry:78.50,   sl:79.00,   tp:76.50,   lots:0.50, result:"Win",  pips:200, rr:4.0, pnl:200,  bias:"Bearish", killzone:true,  confluences:5, emotion:"Confident", notes:"Best trade of the month. High conviction setup." },
  { id:8, date:"2026-08-19", pair:"GBPUSD", session:"London Open",    setup:"CHOCH",             direction:"Sell", entry:1.2820,  sl:1.2840,  tp:1.2760,  lots:1.00, result:"Win",  pips:60,  rr:3.0, pnl:600,  bias:"Bearish", killzone:true,  confluences:3, emotion:"Patient",   notes:"Clear CHOCH with bearish order flow confirmation." },
];

const PAIRS    = ["XAUUSD","USOIL","GBPUSD","EURUSD","USDJPY","GBPJPY","NASDAQ","US30","Custom"];
const SESSIONS = ["London Open","New York Open","New York Close","Asian Session","London Close"];
const SETUPS   = ["Fair Value Gap","Order Block","Break of Structure","CHOCH","Liquidity Sweep","Breaker Block","Mitigation Block","OTE","Silver Bullet","Custom"];
const EMOTIONS = ["Confident","Patient","Anxious","Rushed","Revenge Trading","Neutral"];

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const pct = (n,d) => d ? ((n/d)*100).toFixed(1)+"%" : "0%";
const fmt  = n => (n>=0?"+":"")+n.toFixed(0);
const fmtR = n => (n>=0?"+":"")+n.toFixed(2)+"R";
const avg  = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 18px", minWidth:140 }}>
      <div style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color: color||C.text, fontFamily:"monospace" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Tag({ children, color }) {
  const bg = color==="green"?C.green : color==="red"?C.red : color==="amber"?C.amber : C.accent;
  return (
    <span style={{ background:bg+"22", color:bg, border:`1px solid ${bg}44`, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function MiniBar({ value, max, color }) {
  const w = Math.min(100, Math.abs(value)/Math.max(Math.abs(max),1)*100);
  return (
    <div style={{ background:C.border, borderRadius:3, height:6, width:"100%", overflow:"hidden" }}>
      <div style={{ width:`${w}%`, height:"100%", background:color, borderRadius:3, transition:"width 0.4s" }} />
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function Dashboard({ trades }) {
  const wins   = trades.filter(t=>t.result==="Win");
  const losses = trades.filter(t=>t.result==="Loss");
  const winRate = pct(wins.length, trades.length);
  const totalPnl = trades.reduce((a,t)=>a+t.pnl,0);
  const avgRR = avg(wins.map(t=>t.rr));
  const grossWin  = wins.reduce((a,t)=>a+t.pnl,0);
  const grossLoss = Math.abs(losses.reduce((a,t)=>a+t.pnl,0));
  const pf = grossLoss ? (grossWin/grossLoss).toFixed(2) : "∞";

  // Equity curve
  let running = 0;
  const equity = trades.map(t=>{ running+=t.pnl; return { date:t.date, val:running }; });

  // By setup
  const bySetup = {};
  trades.forEach(t=>{
    if(!bySetup[t.setup]) bySetup[t.setup]={wins:0,total:0};
    bySetup[t.setup].total++;
    if(t.result==="Win") bySetup[t.setup].wins++;
  });

  // By session
  const bySession = {};
  trades.forEach(t=>{
    if(!bySession[t.session]) bySession[t.session]={wins:0,total:0,pnl:0};
    bySession[t.session].total++;
    bySession[t.session].pnl+=t.pnl;
    if(t.result==="Win") bySession[t.session].wins++;
  });

  const maxEq = Math.max(...equity.map(e=>e.val),1);
  const minEq = Math.min(...equity.map(e=>e.val),0);
  const eqRange = maxEq - minEq || 1;
  const W=480, H=120, pad=10;
  const eqPoints = equity.map((e,i)=>{
    const x = pad + (i/(equity.length-1||1))*(W-pad*2);
    const y = H-pad - ((e.val-minEq)/eqRange)*(H-pad*2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div>
      <h2 style={{ color:C.text, marginBottom:20, fontWeight:700, fontSize:22 }}>Dashboard</h2>

      {/* Stats row */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <StatCard label="Total Trades"  value={trades.length} />
        <StatCard label="Win Rate"      value={winRate} color={parseFloat(winRate)>=50?C.green:C.red} />
        <StatCard label="Avg RR"        value={avgRR.toFixed(2)+"R"} color={C.accentL} />
        <StatCard label="Total P&L"     value={"£"+fmt(totalPnl)} color={totalPnl>=0?C.green:C.red} />
        <StatCard label="Profit Factor" value={pf} color={parseFloat(pf)>=1.5?C.green:C.amber} />
        <StatCard label="Gross Win"     value={"£"+grossWin.toFixed(0)} color={C.green} />
        <StatCard label="Gross Loss"    value={"£"+grossLoss.toFixed(0)} color={C.red} />
        <StatCard label="Wins / Losses" value={`${wins.length} / ${losses.length}`} />
      </div>

      {/* Equity Curve */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20, marginBottom:20 }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Equity Curve</div>
        {equity.length > 1 ? (
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={C.accent} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polyline points={eqPoints} fill="none" stroke={C.accent} strokeWidth="2" strokeLinejoin="round"/>
            <polygon points={`${pad},${H-pad} ${eqPoints} ${W-pad},${H-pad}`} fill="url(#eqGrad)"/>
          </svg>
        ) : (
          <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"20px 0" }}>Log more trades to see your equity curve</div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
          <span style={{ fontSize:11, color:C.muted }}>{equity[0]?.date}</span>
          <span style={{ fontSize:11, color:totalPnl>=0?C.green:C.red, fontWeight:700 }}>£{fmt(totalPnl)}</span>
          <span style={{ fontSize:11, color:C.muted }}>{equity[equity.length-1]?.date}</span>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* By Setup */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Win Rate by Setup</div>
          {Object.entries(bySetup).map(([s,d])=>(
            <div key={s} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, color:C.text }}>{s}</span>
                <span style={{ fontSize:12, color:C.accentL, fontFamily:"monospace" }}>{pct(d.wins,d.total)}</span>
              </div>
              <MiniBar value={d.wins} max={d.total} color={C.accent} />
            </div>
          ))}
        </div>

        {/* By Session */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>P&L by Session</div>
          {Object.entries(bySession).map(([s,d])=>(
            <div key={s} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, color:C.text }}>{s}</span>
                <span style={{ fontSize:12, color:d.pnl>=0?C.green:C.red, fontFamily:"monospace" }}>£{fmt(d.pnl)}</span>
              </div>
              <MiniBar value={Math.abs(d.pnl)} max={Math.max(...Object.values(bySession).map(x=>Math.abs(x.pnl)))} color={d.pnl>=0?C.green:C.red} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogTrade({ onAdd }) {
  const empty = { date:"", pair:"XAUUSD", session:"London Open", setup:"Fair Value Gap", direction:"Buy", entry:"", sl:"", tp:"", lots:"0.10", result:"Win", bias:"Bullish", killzone:true, confluences:3, emotion:"Confident", notes:"" };
  const [form, setForm] = useState(empty);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const calcs = useMemo(()=>{
    const e=parseFloat(form.entry), sl=parseFloat(form.sl), tp=parseFloat(form.tp), lots=parseFloat(form.lots)||0.1;
    if(!e||!sl||!tp) return { pips:"—", rr:"—", pnl:"—" };
    const isBuy = form.direction==="Buy";
    const rawPips = isBuy ? tp-e : e-tp;
    const slPips  = isBuy ? e-sl : sl-e;
    const pips = (rawPips*10000).toFixed(1);
    const rr   = slPips ? (rawPips/slPips).toFixed(2) : "—";
    const pair = form.pair;
    const pipVal = pair.includes("JPY") ? lots*1000 : pair==="XAUUSD"||pair==="USOIL" ? lots*10 : lots*10;
    const pnl = (rawPips * pipVal * (pair==="XAUUSD"?1:1)).toFixed(0);
    return { pips, rr, pnl };
  },[form]);

  const submit = () => {
    if(!form.date||!form.entry||!form.sl||!form.tp){ alert("Fill in date, entry, SL and TP"); return; }
    onAdd({
      ...form,
      entry:parseFloat(form.entry), sl:parseFloat(form.sl), tp:parseFloat(form.tp),
      lots:parseFloat(form.lots)||0.1,
      pips:parseFloat(calcs.pips)||0,
      rr:parseFloat(calcs.rr)||0,
      pnl:parseFloat(calcs.pnl)||0,
      confluences:parseInt(form.confluences)||1,
    });
    setForm(empty);
    alert("Trade logged successfully ✓");
  };

  const inp = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, padding:"9px 12px", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" };
  const sel = { ...inp };
  const lbl = { fontSize:12, color:C.muted, marginBottom:5, display:"block" };

  const Field = ({ label, children }) => (
    <div style={{ marginBottom:14 }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );

  return (
    <div>
      <h2 style={{ color:C.text, marginBottom:20, fontWeight:700, fontSize:22 }}>Log Trade</h2>

      {/* Live calc banner */}
      <div style={{ background:C.card, border:`1px solid ${C.accent}44`, borderRadius:10, padding:"14px 20px", marginBottom:24, display:"flex", gap:32 }}>
        <div><span style={{ fontSize:11, color:C.muted }}>PIPS </span><span style={{ fontSize:20, fontWeight:700, color:C.accentL, fontFamily:"monospace" }}>{calcs.pips}</span></div>
        <div><span style={{ fontSize:11, color:C.muted }}>R:R </span><span style={{ fontSize:20, fontWeight:700, color:parseFloat(calcs.rr)>=2?C.green:C.amber, fontFamily:"monospace" }}>{calcs.rr}</span></div>
        <div><span style={{ fontSize:11, color:C.muted }}>P&L </span><span style={{ fontSize:20, fontWeight:700, color:parseFloat(calcs.pnl)>=0?C.green:C.red, fontFamily:"monospace" }}>£{calcs.pnl}</span></div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Left col */}
        <div>
          <Field label="Date & Time"><input type="datetime-local" style={inp} value={form.date} onChange={e=>set("date",e.target.value)}/></Field>
          <Field label="Pair">
            <select style={sel} value={form.pair} onChange={e=>set("pair",e.target.value)}>
              {PAIRS.map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Session">
            <select style={sel} value={form.session} onChange={e=>set("session",e.target.value)}>
              {SESSIONS.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Setup Type">
            <select style={sel} value={form.setup} onChange={e=>set("setup",e.target.value)}>
              {SETUPS.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Direction">
            <div style={{ display:"flex", gap:10 }}>
              {["Buy","Sell"].map(d=>(
                <button key={d} onClick={()=>set("direction",d)} style={{ flex:1, padding:"9px 0", borderRadius:7, border:`1px solid ${form.direction===d?(d==="Buy"?C.green:C.red):C.border}`, background:form.direction===d?(d==="Buy"?C.green+"22":C.red+"22"):C.surface, color:form.direction===d?(d==="Buy"?C.green:C.red):C.muted, fontWeight:700, cursor:"pointer", fontSize:13 }}>
                  {d==="Buy"?"▲ Buy":"▼ Sell"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Result">
            <div style={{ display:"flex", gap:8 }}>
              {["Win","Loss","Breakeven"].map(r=>(
                <button key={r} onClick={()=>set("result",r)} style={{ flex:1, padding:"8px 0", borderRadius:7, border:`1px solid ${form.result===r?C.accent:C.border}`, background:form.result===r?C.accent+"22":C.surface, color:form.result===r?C.accent:C.muted, fontWeight:600, cursor:"pointer", fontSize:12 }}>
                  {r}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Right col */}
        <div>
          <Field label="Entry Price"><input type="number" style={inp} placeholder="e.g. 2410.50" value={form.entry} onChange={e=>set("entry",e.target.value)}/></Field>
          <Field label="Stop Loss"><input type="number" style={inp} placeholder="e.g. 2405.00" value={form.sl} onChange={e=>set("sl",e.target.value)}/></Field>
          <Field label="Take Profit"><input type="number" style={inp} placeholder="e.g. 2421.00" value={form.tp} onChange={e=>set("tp",e.target.value)}/></Field>
          <Field label="Lot Size"><input type="number" style={inp} placeholder="0.10" value={form.lots} onChange={e=>set("lots",e.target.value)}/></Field>
          <Field label="Daily Bias">
            <select style={sel} value={form.bias} onChange={e=>set("bias",e.target.value)}>
              {["Bullish","Bearish","Neutral"].map(b=><option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Emotional State">
            <select style={sel} value={form.emotion} onChange={e=>set("emotion",e.target.value)}>
              {EMOTIONS.map(em=><option key={em}>{em}</option>)}
            </select>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Waited for Killzone?">
              <div style={{ display:"flex", gap:8 }}>
                {[true,false].map(v=>(
                  <button key={String(v)} onClick={()=>set("killzone",v)} style={{ flex:1, padding:"8px 0", borderRadius:7, border:`1px solid ${form.killzone===v?C.accent:C.border}`, background:form.killzone===v?C.accent+"22":C.surface, color:form.killzone===v?C.accent:C.muted, fontWeight:600, cursor:"pointer", fontSize:12 }}>
                    {v?"Yes":"No"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Confluences (1-5)">
              <input type="number" min="1" max="5" style={inp} value={form.confluences} onChange={e=>set("confluences",e.target.value)}/>
            </Field>
          </div>
        </div>
      </div>

      <Field label="Post-Trade Notes">
        <textarea style={{ ...inp, height:90, resize:"vertical" }} placeholder="What went well? What would you do differently?" value={form.notes} onChange={e=>set("notes",e.target.value)}/>
      </Field>

      <button onClick={submit} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:8, padding:"13px 32px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", marginTop:4 }}>
        Log Trade →
      </button>
    </div>
  );
}

function TradeLog({ trades, onDelete }) {
  const [filter, setFilter] = useState({ pair:"All", session:"All", setup:"All", result:"All" });
  const [expanded, setExpanded] = useState(null);

  const filtered = trades.filter(t=>
    (filter.pair==="All"||t.pair===filter.pair) &&
    (filter.session==="All"||t.session===filter.session) &&
    (filter.setup==="All"||t.setup===filter.setup) &&
    (filter.result==="All"||t.result===filter.result)
  );

  const sel = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, padding:"7px 10px", fontSize:12 };

  return (
    <div>
      <h2 style={{ color:C.text, marginBottom:16, fontWeight:700, fontSize:22 }}>Trade Log</h2>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        {[["pair",["All",...PAIRS]],["session",["All",...SESSIONS]],["setup",["All",...SETUPS]],["result",["All","Win","Loss","Breakeven"]]].map(([k,opts])=>(
          <select key={k} style={sel} value={filter[k]} onChange={e=>setFilter(f=>({...f,[k]:e.target.value}))}>
            {opts.map(o=><option key={o}>{o}</option>)}
          </select>
        ))}
        <div style={{ marginLeft:"auto", fontSize:12, color:C.muted, alignSelf:"center" }}>{filtered.length} trades</div>
      </div>

      {/* Table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["Date","Pair","Session","Setup","Dir","Result","Pips","R:R","P&L",""].map(h=>(
                <th key={h} style={{ padding:"12px 14px", color:C.muted, fontWeight:500, textAlign:"left", fontSize:11, textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={10} style={{ padding:32, textAlign:"center", color:C.muted }}>No trades match your filters</td></tr>
            )}
            {filtered.map(t=>(
              <>
                <tr key={t.id} onClick={()=>setExpanded(expanded===t.id?null:t.id)} style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer", transition:"background 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"12px 14px", color:C.muted }}>{t.date?.slice(0,10)||"—"}</td>
                  <td style={{ padding:"12px 14px", color:C.text, fontWeight:600 }}>{t.pair}</td>
                  <td style={{ padding:"12px 14px", color:C.muted }}>{t.session?.split(" ")[0]}</td>
                  <td style={{ padding:"12px 14px", color:C.muted }}>{t.setup?.split(" ").slice(0,2).join(" ")}</td>
                  <td style={{ padding:"12px 14px" }}><Tag color={t.direction==="Buy"?"green":"red"}>{t.direction}</Tag></td>
                  <td style={{ padding:"12px 14px" }}><Tag color={t.result==="Win"?"green":t.result==="Loss"?"red":"amber"}>{t.result}</Tag></td>
                  <td style={{ padding:"12px 14px", fontFamily:"monospace", color:t.pips>=0?C.green:C.red }}>{t.pips>=0?"+":""}{t.pips}</td>
                  <td style={{ padding:"12px 14px", fontFamily:"monospace", color:t.rr>=2?C.green:t.rr<0?C.red:C.amber }}>{fmtR(t.rr)}</td>
                  <td style={{ padding:"12px 14px", fontFamily:"monospace", fontWeight:700, color:t.pnl>=0?C.green:C.red }}>£{fmt(t.pnl)}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <button onClick={e=>{e.stopPropagation();onDelete(t.id)}} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16, padding:"2px 6px" }}>✕</button>
                  </td>
                </tr>
                {expanded===t.id && (
                  <tr key={t.id+"_exp"} style={{ background:C.surface, borderBottom:`1px solid ${C.border}` }}>
                    <td colSpan={10} style={{ padding:"16px 20px" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
                        {[["Bias",t.bias],["Emotion",t.emotion],["Killzone",t.killzone?"Yes":"No"],["Confluences",t.confluences],["Entry",t.entry],["SL",t.sl],["TP",t.tp],["Lots",t.lots]].map(([l,v])=>(
                          <div key={l}><span style={{ fontSize:11, color:C.muted }}>{l}: </span><span style={{ fontSize:12, color:C.text, fontWeight:600 }}>{v}</span></div>
                        ))}
                      </div>
                      {t.notes && <div style={{ fontSize:13, color:C.muted, fontStyle:"italic", borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:4 }}>"{t.notes}"</div>}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PropFirmMode() {
  const [cfg, setCfg] = useState({ accountSize:10000, maxDaily:5, maxTotal:10, profitTarget:10, consistency:30 });
  const [current, setCurrent] = useState({ dailyPnl:250, totalPnl:650, daysTrade:4 });
  const set = (k,v) => setCfg(f=>({...f,[k]:v}));
  const setC = (k,v) => setCurrent(f=>({...f,[k]:v}));

  const dailyPct   = (Math.abs(current.dailyPnl)/cfg.accountSize*100).toFixed(2);
  const totalPct   = (current.totalPnl/cfg.accountSize*100).toFixed(2);
  const targetPct  = cfg.profitTarget;
  const progress   = Math.min(100, (parseFloat(totalPct)/targetPct)*100);

  const dailyWarn  = parseFloat(dailyPct) >= cfg.maxDaily*0.8;
  const totalWarn  = parseFloat(totalPct) <= -cfg.maxTotal*0.8;

  const inp = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, padding:"8px 12px", fontSize:13, width:"100%", boxSizing:"border-box" };

  return (
    <div>
      <h2 style={{ color:C.text, marginBottom:20, fontWeight:700, fontSize:22 }}>Prop Firm Mode</h2>

      {dailyWarn && <div style={{ background:C.red+"22", border:`1px solid ${C.red}`, borderRadius:8, padding:"12px 16px", marginBottom:14, color:C.red, fontWeight:600 }}>⚠ Approaching daily drawdown limit — {dailyPct}% of {cfg.maxDaily}% used</div>}
      {totalWarn && <div style={{ background:C.red+"22", border:`1px solid ${C.red}`, borderRadius:8, padding:"12px 16px", marginBottom:14, color:C.red, fontWeight:600 }}>⚠ Approaching maximum drawdown — {totalPct}% drawdown of {cfg.maxTotal}% limit</div>}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Account Config</div>
          {[["accountSize","Account Size (£)"],["maxDaily","Max Daily DD (%)"],["maxTotal","Max Total DD (%)"],["profitTarget","Profit Target (%)"],["consistency","Consistency Rule (%)"]].map(([k,l])=>(
            <div key={k} style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>{l}</label>
              <input type="number" style={inp} value={cfg[k]} onChange={e=>set(k,parseFloat(e.target.value)||0)}/>
            </div>
          ))}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Live Tracking</div>
          {[["dailyPnl","Today's P&L (£)"],["totalPnl","Total P&L (£)"],["daysTrade","Days Traded"]].map(([k,l])=>(
            <div key={k} style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>{l}</label>
              <input type="number" style={inp} value={current[k]} onChange={e=>setC(k,parseFloat(e.target.value)||0)}/>
            </div>
          ))}

          <div style={{ marginTop:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, color:C.muted }}>Profit Target Progress</span>
              <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>{parseFloat(totalPct)>=0?totalPct:"0"}% / {targetPct}%</span>
            </div>
            <div style={{ background:C.border, borderRadius:6, height:10, overflow:"hidden" }}>
              <div style={{ width:`${progress}%`, height:"100%", background:C.green, borderRadius:6, transition:"width 0.4s" }}/>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:20 }}>
            {[["Daily DD",dailyPct+"%",dailyWarn?C.red:C.green],["Total P&L",`£${current.totalPnl}`,current.totalPnl>=0?C.green:C.red],["Days",current.daysTrade,C.accentL]].map(([l,v,co])=>(
              <div key={l} style={{ background:C.surface, borderRadius:8, padding:12, textAlign:"center" }}>
                <div style={{ fontSize:10, color:C.muted, marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:700, color:co, fontFamily:"monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase tracker */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Evaluation Phases</div>
        <div style={{ display:"flex", gap:12 }}>
          {["Phase 1","Phase 2","Funded"].map((ph,i)=>(
            <div key={ph} style={{ flex:1, background: i===0?C.accent+"22":C.surface, border:`1px solid ${i===0?C.accent:C.border}`, borderRadius:8, padding:"14px 16px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:i===0?C.accent:C.muted, marginBottom:6, fontWeight:600 }}>{ph}</div>
              <div style={{ fontSize:20, fontWeight:700, color:i===0?C.accent:C.muted }}>{i===0?"Active":i===2?"🎯":"—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Statistics({ trades }) {
  const monthly = {};
  trades.forEach(t=>{
    const m = (t.date||"").slice(0,7);
    if(!monthly[m]) monthly[m]={trades:0,wins:0,pnl:0};
    monthly[m].trades++;
    monthly[m].pnl+=t.pnl;
    if(t.result==="Win") monthly[m].wins++;
  });

  const byEmotion = {};
  trades.forEach(t=>{
    if(!byEmotion[t.emotion]) byEmotion[t.emotion]={wins:0,total:0};
    byEmotion[t.emotion].total++;
    if(t.result==="Win") byEmotion[t.emotion].wins++;
  });

  return (
    <div>
      <h2 style={{ color:C.text, marginBottom:20, fontWeight:700, fontSize:22 }}>Statistics</h2>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        {/* Monthly breakdown */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Monthly P&L</div>
          <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["Month","Trades","W/R","P&L"].map(h=><th key={h} style={{ padding:"6px 10px", color:C.muted, fontWeight:500, textAlign:"left", fontSize:11 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Object.entries(monthly).sort().map(([m,d])=>(
                <tr key={m} style={{ borderBottom:`1px solid ${C.border}44` }}>
                  <td style={{ padding:"10px 10px", color:C.text }}>{m}</td>
                  <td style={{ padding:"10px 10px", color:C.muted }}>{d.trades}</td>
                  <td style={{ padding:"10px 10px", color:C.accentL }}>{pct(d.wins,d.trades)}</td>
                  <td style={{ padding:"10px 10px", fontFamily:"monospace", fontWeight:700, color:d.pnl>=0?C.green:C.red }}>£{fmt(d.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Emotion vs win rate */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Emotion vs Win Rate</div>
          {Object.entries(byEmotion).map(([em,d])=>(
            <div key={em} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, color:C.text }}>{em}</span>
                <span style={{ fontSize:12, color:parseFloat(pct(d.wins,d.total))>=50?C.green:C.red, fontFamily:"monospace" }}>{pct(d.wins,d.total)} ({d.total})</span>
              </div>
              <MiniBar value={d.wins} max={d.total} color={parseFloat(pct(d.wins,d.total))>=50?C.green:C.red} />
            </div>
          ))}

          <div style={{ marginTop:20, padding:"12px 0", borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>KEY INSIGHTS</div>
            {Object.entries(byEmotion).sort((a,b)=>b[1].wins/b[1].total-a[1].wins/a[1].total).slice(0,1).map(([em,d])=>(
              <div key={em} style={{ fontSize:12, color:C.green }}>✓ Best state: {em} ({pct(d.wins,d.total)} win rate)</div>
            ))}
            {Object.entries(byEmotion).sort((a,b)=>a[1].wins/a[1].total-b[1].wins/b[1].total).slice(0,1).map(([em,d])=>(
              <div key={em} style={{ fontSize:12, color:C.red, marginTop:4 }}>✗ Worst state: {em} ({pct(d.wins,d.total)} win rate)</div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats grid */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
        <div style={{ fontSize:12, color:C.muted, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Performance Summary</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
          {[
            ["Best Trade","£"+Math.max(...trades.map(t=>t.pnl),0).toFixed(0), C.green],
            ["Worst Trade","£"+Math.min(...trades.map(t=>t.pnl),0).toFixed(0), C.red],
            ["Avg Win","£"+avg(trades.filter(t=>t.result==="Win").map(t=>t.pnl)).toFixed(0), C.green],
            ["Avg Loss","£"+avg(trades.filter(t=>t.result==="Loss").map(t=>t.pnl)).toFixed(0), C.red],
            ["Best Pair", trades.reduce((best,t)=>t.pnl>(best.pnl||0)?t:best,{}).pair||"—", C.accentL],
            ["Best Setup", trades.reduce((best,t)=>t.pnl>(best.pnl||0)?t:best,{}).setup?.split(" ").slice(0,2).join(" ")||"—", C.accentL],
            ["Killzone WR", pct(trades.filter(t=>t.killzone&&t.result==="Win").length, trades.filter(t=>t.killzone).length), C.amber],
            ["Non-KZ WR", pct(trades.filter(t=>!t.killzone&&t.result==="Win").length, trades.filter(t=>!t.killzone).length), C.amber],
          ].map(([l,v,co])=>(
            <div key={l} style={{ background:C.surface, borderRadius:8, padding:"14px 16px" }}>
              <div style={{ fontSize:10, color:C.muted, marginBottom:4, textTransform:"uppercase" }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:700, color:co, fontFamily:"monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function SMCJournal() {
  const [page, setPage] = useState("dashboard");
  const [trades, setTrades] = useState(SEED_TRADES);

  const addTrade = t => setTrades(ts=>[...ts,{ ...t, id: Date.now() }]);
  const delTrade = id => setTrades(ts=>ts.filter(t=>t.id!==id));

  const nav = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"log",       icon:"✏️",  label:"Log Trade" },
    { id:"tradelog",  icon:"📋", label:"Trade Log" },
    { id:"propfirm",  icon:"🏦", label:"Prop Firm" },
    { id:"stats",     icon:"📈", label:"Statistics" },
  ];

  const totalPnl = trades.reduce((a,t)=>a+t.pnl,0);
  const winRate  = trades.length ? ((trades.filter(t=>t.result==="Win").length/trades.length)*100).toFixed(0) : 0;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:C.text }}>
      {/* Sidebar */}
      <div style={{ width:220, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"24px 0", flexShrink:0 }}>
        {/* Logo */}
        <div style={{ padding:"0 20px 24px", borderBottom:`1px solid ${C.border}`, marginBottom:8 }}>
          <div style={{ fontSize:18, fontWeight:800, color:C.accent, letterSpacing:-0.5 }}>SMC Journal</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Smart Money Concepts</div>
        </div>

        {/* Quick stats */}
        <div style={{ padding:"12px 20px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <div><div style={{ fontSize:10, color:C.muted }}>TOTAL P&L</div><div style={{ fontSize:15, fontWeight:700, color:totalPnl>=0?C.green:C.red, fontFamily:"monospace" }}>£{fmt(totalPnl)}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:C.muted }}>WIN RATE</div><div style={{ fontSize:15, fontWeight:700, color:winRate>=50?C.green:C.red }}>{winRate}%</div></div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"0 10px" }}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:8, border:"none", background:page===n.id?C.accent+"22":"transparent", color:page===n.id?C.accent:C.muted, fontSize:13, fontWeight:page===n.id?600:400, cursor:"pointer", marginBottom:2, textAlign:"left", transition:"all 0.15s" }}>
              <span style={{ fontSize:16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}`, fontSize:11, color:C.muted }}>
          {trades.length} trades logged
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, padding:"32px 36px", overflowY:"auto", maxHeight:"100vh" }}>
        {page==="dashboard" && <Dashboard trades={trades}/>}
        {page==="log"       && <LogTrade onAdd={addTrade}/>}
        {page==="tradelog"  && <TradeLog trades={trades} onDelete={delTrade}/>}
        {page==="propfirm"  && <PropFirmMode/>}
        {page==="stats"     && <Statistics trades={trades}/>}
      </div>
    </div>
  );
}
