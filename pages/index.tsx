import { useState, useMemo, useCallback, useRef, type JSX } from "react";
import type { NextPage } from "next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";

const MANDANTES = [
  "coopeuch","directv","hites","forum","wom",
  "cruzblanca_cp","cruzblanca_da","cruzblanca_mb",
  "rutapass","rutasur","volvo","uss","ugm","udalba",
  "inacap","hites_vigente","verisure","verisure_prejudicial","autopista_vespucio_norte"
];

const DECAY_LABELS = ["Nueva","Dorada","Decayendo","Mala","Crítica","Zombi"];
const DECAY_COLORS = ["#22c55e","#eab308","#f97316","#ef4444","#991b1b","#4b5563"];
const SEGMENTO_COLORS: Record<string,string> = { Alta:"#22c55e", Media:"#eab308", Baja:"#ef4444" };
const DEFAULT_TRAMOS = [
  {label:"0-100K",min:0,max:100000},{label:"100K-500K",min:100000,max:500000},
  {label:"500K-1M",min:500000,max:1000000},{label:"1M-5M",min:1000000,max:5000000},
  {label:"5M+",min:5000000,max:Infinity},
];

const MOCK_HISTORICO = Array.from({length:12},(_,i)=>{
  const month = new Date(2025,i,1);
  return {
    mes: month.toLocaleDateString("es-CL",{month:"short",year:"2-digit"}),
    tasa_pago: 0.35+Math.random()*0.15,
    deudores: Math.floor(400000+Math.random()*100000),
    accuracy: 0.88+Math.random()*0.03,
  };
});

// ─── Icons ───────────────────────────────────────────────────
const Icons = {
  Upload: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Chart: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Grid: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  Clock: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Download: ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  File: ()=><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Check: ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Settings: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

const fmt = (n: number | undefined) => n?.toLocaleString("es-CL") ?? "—";
const fmtCLP = (n: number) => `$${(n/1000000).toFixed(0)}M`;
const fmtPct = (n: number) => `${(n*100).toFixed(1)}%`;

function KPI({label,value,sub,accent}: {label:string,value:string,sub?:string,accent?:string}) {
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"20px 24px",flex:1,minWidth:180}}>
      <div style={{fontSize:11,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,color:accent||"#f1f5f9",fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:"#64748b",marginTop:4}}>{sub}</div>}
    </div>
  );
}

function Badge({children,color}: {children:React.ReactNode,color:string}) {
  return <span style={{display:"inline-block",padding:"2px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:`${color}22`,color,letterSpacing:0.5}}>{children}</span>;
}

// ─── Normalize CF response → dashboard fields ────────────────
function normalizeResultados(raw: any[]): any[] {
  const sorted = [...raw].sort((a, b) =>
    parseFloat(b.PROBA_PAGO ?? b.proba_pago ?? 0) -
    parseFloat(a.PROBA_PAGO ?? a.proba_pago ?? 0)
  );
  const n = sorted.length || 1;
  return sorted.map((r, idx) => {
    const prob  = parseFloat(r.PROBA_PAGO   ?? r.proba_pago   ?? 0);
    const decay = parseInt  (r.DECAY_NIVEL  ?? r.decay_nivel  ?? 1);
    const gRaw  = parseInt  (r.GENERO       ?? r.genero       ?? 0);
    return {
      nombre_deudor:     r.NOMBRE_DEUDOR ?? r.nombre_deudor ?? "",
      rut:               r.RUT           ?? r.rut           ?? "",
      primora:           parseFloat(r.PRIMORA  ?? r.primora  ?? 0),
      importe:           parseFloat(r.IMPORTE  ?? r.importe  ?? 0),
      edad:              parseFloat(r.EDAD     ?? r.edad     ?? 0),
      genero:            gRaw === 1 ? "M" : gRaw === 2 ? "F" : "—",
      industria:         r.INDUSTRIA     ?? r.industria     ?? "SERVICIOS",
      proba_pago:        prob,
      pred_pago:         parseInt(r.PRED_PAGO ?? r.pred_pago ?? 0),
      decay_nivel:       decay,
      decay_label:       r.DECAY_LABEL   ?? r.decay_label   ?? "",
      score_prioridad:   parseFloat(r.SCORE_PRIORIDAD ?? r.score_prioridad ?? 0),
      segmento_pago:     prob >= 0.6 ? "Alta" : prob >= 0.3 ? "Media" : "Baja",
      nivel_estrategico: Math.min(10, Math.floor(idx * 10 / n) + 1),
    };
  });
}

// ─── API helpers ─────────────────────────────────────────────
const API = "/api";

async function apiScore(mandante: string, deudores: unknown[]) {
  const res = await fetch(`${API}/score`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({mandante, deudores})
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

function csvToObjects(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map(h => h.trim().replace(/^\uFEFF/, ""));
  // soporte para coma si no hay punto y coma
  const sep = headers.length > 1 ? ";" : ",";
  const cols = headers.length > 1 ? headers : lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(sep);
    return Object.fromEntries(cols.map((c, i) => [c, (vals[i] ?? "").trim()]));
  });
}

async function apiScoreFile(
  mandante: string,
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{resultados: any[]}> {
  const text = await file.text();
  const rows = csvToObjects(text);

  // 200 registros por chunk — requests pequeños, sin saturar Vercel ni CF
  const CHUNK = 200;
  const chunks: Record<string, string>[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    chunks.push(rows.slice(i, i + CHUNK));
  }

  const allResults: any[] = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const res = await fetch(`${API}/score-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mandante, registros: chunks[ci] }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    allResults.push(...(data.resultados || []));
    onProgress?.(ci + 1, chunks.length);
  }
  return {resultados: allResults};
}

// ─── UPLOAD VIEW ─────────────────────────────────────────────
function UploadView({onProcess, mandante, setMandante}: {onProcess:(data:any[])=>void, mandante:string, setMandante:(m:string)=>void}) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File|null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    if (!file || !mandante) return;
    setLoading(true); setError(null); setProgress(0);
    try {
      const data = await apiScoreFile(mandante, file, (done, total) => {
        setProgress(Math.round((done / total) * 100));
      });
      setProgress(100);
      setTimeout(() => { onProcess(normalizeResultados(data.resultados || [])); }, 400);
    } catch(e: any) {
      setError(e.message); setLoading(false); setProgress(0);
    }
  };

  return (
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{marginBottom:32}}>
        <h2 style={{fontSize:22,fontWeight:700,color:"#f1f5f9",marginBottom:8}}>Subir Asignación</h2>
        <p style={{color:"#94a3b8",fontSize:14}}>Sube un CSV de asignación mensual para enriquecerlo con las 20+ columnas del modelo de scoring.</p>
      </div>

      <div style={{marginBottom:24}}>
        <label style={{fontSize:13,color:"#94a3b8",display:"block",marginBottom:8}}>Mandante</label>
        <select value={mandante} onChange={e=>setMandante(e.target.value)}
          style={{width:"100%",padding:"12px 16px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#f1f5f9",fontSize:14,outline:"none",cursor:"pointer"}}>
          <option value="">Seleccionar mandante...</option>
          {MANDANTES.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div
        onDragEnter={()=>setDragActive(true)} onDragLeave={()=>setDragActive(false)}
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();setDragActive(false);setFile(e.dataTransfer.files[0]);}}
        onClick={()=>{if(!file) fileRef.current?.click();}}
        style={{border:`2px dashed ${dragActive?"#3b82f6":file?"#22c55e":"rgba(255,255,255,0.15)"}`,borderRadius:16,padding:48,textAlign:"center",cursor:"pointer",background:dragActive?"rgba(59,130,246,0.05)":file?"rgba(34,197,94,0.03)":"rgba(255,255,255,0.02)",transition:"all 0.2s ease",marginBottom:24}}>
        <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>setFile(e.target.files?.[0]??null)} />
        {file ? (
          <div>
            <div style={{color:"#22c55e",marginBottom:8}}><Icons.Check /></div>
            <div style={{fontSize:16,fontWeight:600,color:"#f1f5f9"}}>{file.name}</div>
            <div style={{fontSize:13,color:"#94a3b8",marginTop:4}}>{(file.size/1024/1024).toFixed(2)} MB</div>
            <button onClick={e=>{e.stopPropagation();setFile(null);setProgress(0);}}
              style={{marginTop:12,padding:"6px 16px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,color:"#ef4444",fontSize:12,cursor:"pointer"}}>
              Quitar archivo
            </button>
          </div>
        ) : (
          <div>
            <div style={{color:"#64748b",marginBottom:12}}><Icons.File /></div>
            <div style={{fontSize:16,fontWeight:500,color:"#cbd5e1"}}>Arrastra tu CSV aquí</div>
            <div style={{fontSize:13,color:"#64748b",marginTop:4}}>o haz click para seleccionar</div>
            <div style={{fontSize:12,color:"#475569",marginTop:8}}>Columnas: NOMBRE_DEUDOR, RUT, PRIMORA, IMPORTE</div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:13,color:"#94a3b8"}}>Procesando pipeline ML...</span>
            <span style={{fontSize:13,color:"#3b82f6",fontWeight:600}}>{Math.floor(progress)}%</span>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#3b82f6,#8b5cf6)",borderRadius:3,transition:"width 0.3s ease"}} />
          </div>
          <div style={{display:"flex",gap:24,marginTop:12,fontSize:12,color:"#64748b"}}>
            {["Fase 1: Demografía","Fase 2: Predicción","Fase 3: Regiones","NIVEL_ESTRATEGICO"].map((f,i)=>(
              <span key={f} style={{color:progress>(i+1)*22?"#22c55e":"#64748b"}}>{f}</span>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{marginBottom:16,padding:"10px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,color:"#ef4444",fontSize:13}}>{error}</div>}

      <button onClick={handleProcess} disabled={!file||!mandante||loading}
        style={{width:"100%",padding:"14px 24px",background:(!file||!mandante||loading)?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#3b82f6,#8b5cf6)",border:"none",borderRadius:12,color:(!file||!mandante||loading)?"#64748b":"#fff",fontSize:15,fontWeight:600,cursor:(!file||!mandante||loading)?"not-allowed":"pointer",transition:"all 0.2s ease"}}>
        {loading ? "Procesando..." : "Procesar con Modelo ML"}
      </button>

      <div style={{marginTop:32,padding:20,background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:12}}>Pipeline de enriquecimiento</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {[
            {phase:"Fase 1",desc:"Género, Edad, Tipo Persona, Extranjero, Industria",cols:"12 cols"},
            {phase:"Fase 2",desc:"PROBA_PAGO, Decay, Score Prioridad, Segmento",cols:"7 cols"},
            {phase:"Fase 3",desc:"Normalización de Regiones",cols:"1 col"},
            {phase:"Estrategia",desc:"NIVEL_ESTRATEGICO (rank 1-10 por segmento)",cols:"1 col"},
          ].map((p,i)=>(
            <div key={i} style={{padding:12,background:"rgba(255,255,255,0.03)",borderRadius:8,fontSize:11}}>
              <div style={{fontWeight:700,color:"#8b5cf6",marginBottom:4}}>{p.phase}</div>
              <div style={{color:"#94a3b8",lineHeight:1.4}}>{p.desc}</div>
              <div style={{color:"#64748b",marginTop:4}}>{p.cols}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ──────────────────────────────────────────
function DashboardView({results, mandante}: {results:any[], mandante:string}) {
  if (!results.length) return (
    <div style={{textAlign:"center",padding:80,color:"#64748b"}}>
      <Icons.Chart />
      <p style={{marginTop:16}}>Sube y procesa un archivo para ver el dashboard</p>
    </div>
  );

  const totalDeudores = results.length;
  const montoTotal = results.reduce((s,r)=>s+r.importe,0);
  const probaPromedio = results.reduce((s,r)=>s+r.proba_pago,0)/totalDeudores;
  const enVentanaDorada = results.filter(r=>r.decay_nivel<=2).length;

  const decayDist = DECAY_LABELS.map((label,i)=>({
    name:label,
    count:results.filter(r=>r.decay_nivel===i+1).length,
    proba:results.filter(r=>r.decay_nivel===i+1).reduce((s,r)=>s+r.proba_pago,0)/Math.max(1,results.filter(r=>r.decay_nivel===i+1).length),
    fill:DECAY_COLORS[i],
  }));

  const segmentoDist = ["Alta","Media","Baja"].map(seg=>({
    name:seg, value:results.filter(r=>r.segmento_pago===seg).length, fill:SEGMENTO_COLORS[seg]
  }));

  const probaHist = Array.from({length:20},(_,i)=>{
    const lo=i*0.05, hi=(i+1)*0.05;
    return {range:`${(lo*100).toFixed(0)}%`, count:results.filter(r=>r.proba_pago>=lo&&r.proba_pago<hi).length};
  });

  const industriaDist: Record<string,number> = {};
  results.forEach(r=>{industriaDist[r.industria]=(industriaDist[r.industria]||0)+1;});
  const industriaData = Object.entries(industriaDist).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);

  const downloadCSV = () => {
    const cols = ["nombre_deudor","rut","genero","edad","industria","decay_label","proba_pago","score_prioridad","segmento_pago","nivel_estrategico","importe","primora"];
    const csv = [cols.join(","), ...results.map(r=>cols.map(c=>r[c]??"").join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = `scoring_${mandante}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h2 style={{fontSize:22,fontWeight:700,color:"#f1f5f9"}}>Dashboard de Resultados</h2>
        <button onClick={downloadCSV} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:8,color:"#22c55e",fontSize:13,cursor:"pointer",fontWeight:500}}>
          <Icons.Download /> Exportar CSV
        </button>
      </div>

      <div style={{display:"flex",gap:16,marginBottom:32,flexWrap:"wrap"}}>
        <KPI label="Deudores" value={fmt(totalDeudores)} sub="registros procesados" />
        <KPI label="Monto Total" value={fmtCLP(montoTotal)} sub="deuda acumulada" accent="#3b82f6" />
        <KPI label="Prob. Pago Prom." value={fmtPct(probaPromedio)} sub="modelo industria_GB" accent="#8b5cf6" />
        <KPI label="Ventana Dorada" value={`${((enVentanaDorada/totalDeudores)*100).toFixed(0)}%`} sub={`${fmt(enVentanaDorada)} deudores (≤90d)`} accent="#22c55e" />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:16}}>Distribución por Decay</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={decayDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} />
              <YAxis tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} />
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:12}} />
              <Bar dataKey="count" radius={[4,4,0,0]}>{decayDist.map((d,i)=><Cell key={i} fill={d.fill}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:16}}>Segmentación de Pago</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={segmentoDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {segmentoDist.map((d,i)=><Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:12}} />
              <Legend wrapperStyle={{fontSize:12,color:"#94a3b8"}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:24,marginBottom:24}}>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:16}}>Distribución PROBA_PAGO</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={probaHist}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="range" tick={{fill:"#94a3b8",fontSize:10}} interval={3} axisLine={false} />
              <YAxis tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} />
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:12}} />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="rgba(139,92,246,0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:16}}>Por Industria</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {industriaData.slice(0,7).map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:90,fontSize:12,color:"#94a3b8",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{d.name}</div>
                <div style={{flex:1,height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(d.count/industriaData[0].count)*100}%`,background:"#3b82f6",borderRadius:4}} />
                </div>
                <div style={{fontSize:12,color:"#64748b",width:30,textAlign:"right"}}>{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
        <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:16}}>Preview — Primeros 15 Registros</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>{["RUT","Nombre","Género","Edad","Industria","Prob. Pago","Decay","Score","Segmento","Nivel Est."].map(h=>(
                <th key={h} style={{padding:"8px 12px",textAlign:"left",color:"#64748b",borderBottom:"1px solid rgba(255,255,255,0.08)",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {results.slice(0,15).map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <td style={{padding:"8px 12px",color:"#94a3b8",fontFamily:"monospace"}}>{r.rut||"—"}</td>
                  <td style={{padding:"8px 12px",color:"#cbd5e1"}}>{r.nombre_deudor}</td>
                  <td style={{padding:"8px 12px"}}><Badge color={r.genero==="M"?"#3b82f6":"#ec4899"}>{r.genero}</Badge></td>
                  <td style={{padding:"8px 12px",color:"#94a3b8"}}>{r.edad||"—"}</td>
                  <td style={{padding:"8px 12px",color:"#94a3b8"}}>{r.industria}</td>
                  <td style={{padding:"8px 12px",color:r.proba_pago>0.6?"#22c55e":r.proba_pago>0.3?"#eab308":"#ef4444",fontWeight:600,fontFamily:"monospace"}}>{fmtPct(r.proba_pago)}</td>
                  <td style={{padding:"8px 12px"}}><Badge color={DECAY_COLORS[r.decay_nivel-1]}>{r.decay_label}</Badge></td>
                  <td style={{padding:"8px 12px",color:"#cbd5e1",fontFamily:"monospace"}}>{r.score_prioridad}</td>
                  <td style={{padding:"8px 12px"}}><Badge color={SEGMENTO_COLORS[r.segmento_pago]}>{r.segmento_pago}</Badge></td>
                  <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#f1f5f9"}}>{r.nivel_estrategico}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ESTRATEGIA VIEW ─────────────────────────────────────────
function EstrategiaView({results}: {results:any[]}) {
  const [selectedCell, setSelectedCell] = useState<{decay:number,tramo:string}|null>(null);
  const [tramos, setTramos] = useState(DEFAULT_TRAMOS);
  const [showConfig, setShowConfig] = useState(false);
  const [editingTramos, setEditingTramos] = useState(JSON.stringify(DEFAULT_TRAMOS.map(t=>({label:t.label,min:t.min,max:t.max===Infinity?"Infinity":t.max}))));

  const getTramoLabel = useCallback((imp: number)=>{
    for (const t of tramos) if(imp>=t.min&&imp<t.max) return t.label;
    return tramos[tramos.length-1].label;
  },[tramos]);

  const matrix = useMemo(()=>{
    if (!results.length) return {} as Record<number,Record<string,{count:number,avgProba:number,totalMonto:number,results:any[]}>>;
    const m: Record<number,Record<string,{count:number,avgProba:number,totalMonto:number,results:any[]}>> = {};
    DECAY_LABELS.forEach((_,di)=>{
      m[di+1]={};
      tramos.forEach(t=>{
        const cell = results.filter(r=>r.decay_nivel===di+1&&getTramoLabel(r.importe)===t.label);
        m[di+1][t.label]={count:cell.length,avgProba:cell.length?cell.reduce((s:number,r:any)=>s+r.proba_pago,0)/cell.length:0,totalMonto:cell.reduce((s:number,r:any)=>s+r.importe,0),results:cell};
      });
    });
    return m;
  },[results,tramos,getTramoLabel]);

  const selectedData = useMemo(()=>{
    if (!selectedCell) return null;
    const cell = matrix[selectedCell.decay]?.[selectedCell.tramo];
    if (!cell||!cell.results.length) return null;
    const sorted = [...cell.results].sort((a,b)=>b.proba_pago-a.proba_pago);
    const chunkSize = Math.max(1,Math.ceil(sorted.length/10));
    const niveles = Array.from({length:10},(_,i)=>{
      const chunk = sorted.slice(i*chunkSize,(i+1)*chunkSize);
      if (!chunk.length) return null;
      return {nivel:i+1,count:chunk.length,avgProba:chunk.reduce((s:number,r:any)=>s+r.proba_pago,0)/chunk.length,totalMonto:chunk.reduce((s:number,r:any)=>s+r.importe,0)};
    }).filter(Boolean);
    return {...cell,niveles,decayLabel:DECAY_LABELS[selectedCell.decay-1]};
  },[selectedCell,matrix]);

  const maxCount = Math.max(...Object.values(matrix).flatMap(r=>Object.values(r).map(c=>c.count)),1);

  if (!results.length) return (
    <div style={{textAlign:"center",padding:80,color:"#64748b"}}>
      <Icons.Grid />
      <p style={{marginTop:16}}>Procesa un archivo primero para ver la matriz estratégica</p>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#f1f5f9",marginBottom:8}}>Estrategia por Segmento</h2>
          <p style={{color:"#94a3b8",fontSize:14}}>Selecciona una celda PRIMORA × Tramo para ver los 10 niveles de priorización.</p>
        </div>
        <button onClick={()=>setShowConfig(!showConfig)}
          style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"#94a3b8",fontSize:13,cursor:"pointer"}}>
          <Icons.Settings /> Configurar Tramos
        </button>
      </div>

      {showConfig && (
        <div style={{marginBottom:24,padding:20,background:"rgba(139,92,246,0.05)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:12}}>
          <div style={{fontSize:14,fontWeight:600,color:"#8b5cf6",marginBottom:12}}>Configurar Tramos de Deuda</div>
          <textarea value={editingTramos} onChange={e=>setEditingTramos(e.target.value)} rows={8}
            style={{width:"100%",padding:12,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#f1f5f9",fontFamily:"monospace",fontSize:12,resize:"vertical",boxSizing:"border-box"}} />
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={()=>{try{const p=JSON.parse(editingTramos);setTramos(p.map((t:any)=>({...t,max:t.max==="Infinity"?Infinity:Number(t.max),min:Number(t.min)})));setShowConfig(false);}catch(e){}}}
              style={{padding:"8px 20px",background:"#8b5cf6",border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Aplicar</button>
            <button onClick={()=>setShowConfig(false)}
              style={{padding:"8px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"#94a3b8",fontSize:13,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{overflowX:"auto",marginBottom:32}}>
        <table style={{width:"100%",borderCollapse:"separate",borderSpacing:4}}>
          <thead>
            <tr>
              <th style={{padding:"12px 16px",fontSize:12,color:"#64748b",textAlign:"left",fontWeight:600,width:120}}>PRIMORA ↓ \ Tramo →</th>
              {tramos.map(t=><th key={t.label} style={{padding:"8px 12px",fontSize:12,color:"#94a3b8",textAlign:"center",fontWeight:600}}>{t.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {DECAY_LABELS.map((label,di)=>(
              <tr key={di}>
                <td style={{padding:"8px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:10,height:10,borderRadius:2,background:DECAY_COLORS[di],display:"inline-block"}} />
                    <span style={{fontSize:13,color:"#cbd5e1",fontWeight:500}}>{label}</span>
                  </div>
                </td>
                {tramos.map(t=>{
                  const cell = matrix[di+1]?.[t.label]||{count:0,avgProba:0,totalMonto:0,results:[]};
                  const isSelected = selectedCell?.decay===di+1&&selectedCell?.tramo===t.label;
                  const intensity = cell.count/maxCount;
                  return (
                    <td key={t.label} style={{padding:0}}>
                      <button onClick={()=>setSelectedCell(cell.count>0?{decay:di+1,tramo:t.label}:null)}
                        style={{width:"100%",padding:"16px 12px",background:isSelected?"rgba(139,92,246,0.2)":cell.count>0?`rgba(${cell.avgProba>0.5?"34,197,94":cell.avgProba>0.25?"234,179,8":"239,68,68"},${0.05+intensity*0.15})`:"rgba(255,255,255,0.02)",border:isSelected?"2px solid #8b5cf6":"1px solid rgba(255,255,255,0.06)",borderRadius:8,cursor:cell.count>0?"pointer":"default",textAlign:"center",transition:"all 0.15s ease"}}>
                        <div style={{fontSize:18,fontWeight:700,color:cell.count>0?"#f1f5f9":"#334155"}}>{cell.count||"—"}</div>
                        {cell.count>0&&<div style={{fontSize:11,color:cell.avgProba>0.5?"#22c55e":cell.avgProba>0.25?"#eab308":"#ef4444",marginTop:2,fontWeight:600}}>{fmtPct(cell.avgProba)}</div>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedData && (
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <h3 style={{fontSize:18,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>{selectedData.decayLabel} × {selectedCell?.tramo}</h3>
              <p style={{color:"#94a3b8",fontSize:13}}>{fmt(selectedData.count)} deudores · {fmtCLP(selectedData.totalMonto)} · Prob. promedio: {fmtPct(selectedData.avgProba)}</p>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:6,marginBottom:20}}>
            {selectedData.niveles.map((n: any)=>{
              const hue = ((10-n.nivel)/9)*120;
              return (
                <div key={n.nivel} style={{padding:"14px 8px",background:`hsla(${hue},60%,50%,0.08)`,border:`1px solid hsla(${hue},60%,50%,0.2)`,borderRadius:8,textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:`hsl(${hue},60%,60%)`}}>{n.nivel}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>{n.count} deud.</div>
                  <div style={{fontSize:12,fontWeight:700,color:`hsl(${hue},60%,60%)`,marginTop:2}}>{fmtPct(n.avgProba)}</div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{fmtCLP(n.totalMonto)}</div>
                </div>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={selectedData.niveles}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="nivel" tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} />
              <YAxis tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} domain={[0,1]} tickFormatter={fmtPct} />
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:12}} formatter={(v: any)=>fmtPct(v)} />
              <Bar dataKey="avgProba" name="Prob. Pago Promedio" radius={[4,4,0,0]}>
                {selectedData.niveles.map((n: any)=>{const hue=((10-n.nivel)/9)*120; return <Cell key={n.nivel} fill={`hsl(${hue},60%,50%)`}/>;} )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── HISTORICO VIEW ──────────────────────────────────────────
function HistoricoView() {
  return (
    <div>
      <h2 style={{fontSize:22,fontWeight:700,color:"#f1f5f9",marginBottom:8}}>Histórico & Performance</h2>
      <p style={{color:"#94a3b8",fontSize:14,marginBottom:32}}>Evolución mensual del modelo de scoring y métricas de cartera.</p>
      <div style={{display:"flex",gap:16,marginBottom:32,flexWrap:"wrap"}}>
        <KPI label="AUC Modelo" value="0.9014" sub="industria_GB.pkl (champion)" accent="#22c55e" />
        <KPI label="Cobertura" value="20%+" sub="población adulta Chile" accent="#3b82f6" />
        <KPI label="Registros Entrenamiento" value="11.1M" sub="19 mandantes" accent="#8b5cf6" />
        <KPI label="Features" value="19" sub="demográficas + decay" />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:16}}>Tasa de Pago Mensual</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK_HISTORICO}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="mes" tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} />
              <YAxis tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} domain={[0.2,0.6]} tickFormatter={fmtPct} />
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:12}} formatter={(v: any)=>fmtPct(v)} />
              <Line type="monotone" dataKey="tasa_pago" stroke="#22c55e" strokeWidth={2.5} dot={{fill:"#22c55e",r:3}} name="Tasa de Pago" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:16}}>Accuracy del Modelo</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_HISTORICO}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="mes" tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} />
              <YAxis tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} domain={[0.85,0.95]} tickFormatter={fmtPct} />
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontSize:12}} formatter={(v: any)=>fmtPct(v)} />
              <Area type="monotone" dataKey="accuracy" stroke="#8b5cf6" fill="rgba(139,92,246,0.15)" strokeWidth={2} name="Accuracy" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{padding:20,background:"rgba(234,179,8,0.05)",border:"1px solid rgba(234,179,8,0.15)",borderRadius:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{color:"#eab308"}}><Icons.Alert /></span>
          <span style={{fontSize:14,fontWeight:600,color:"#eab308"}}>Hallazgos Clave del Análisis</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
          <div><div style={{fontWeight:600,color:"#cbd5e1",marginBottom:4}}>Ventana Dorada</div>31-90 días: 44-53% de pago. Half-life: 383 días. Oportunidad máxima de recuperación.</div>
          <div><div style={{fontWeight:600,color:"#cbd5e1",marginBottom:4}}>Industria (V=0.365)</div>Variable más predictiva. Financiero decae 3.58pp cada 100 días.</div>
          <div><div style={{fontWeight:600,color:"#cbd5e1",marginBottom:4}}>Género × Edad</div>Hombres 12% más sensibles al decay. Grupo 56-65 más vulnerable. 66+ los más resilientes.</div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const [view, setView] = useState("upload");
  const [results, setResults] = useState<any[]>([]);
  const [mandante, setMandante] = useState("");

  const nav = [
    {id:"upload",label:"Upload & Score",icon:<Icons.Upload/>},
    {id:"dashboard",label:"Dashboard",icon:<Icons.Chart/>},
    {id:"estrategia",label:"Estrategia",icon:<Icons.Grid/>},
    {id:"historico",label:"Histórico",icon:<Icons.Clock/>},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",color:"#e2e8f0",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(15,23,42,0.95)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>O</div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",letterSpacing:-0.3}}>Orsan Scoring</div>
              <div style={{fontSize:10,color:"#64748b",letterSpacing:1,textTransform:"uppercase"}}>Pipeline ML · industria_GB v29</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4}}>
            {nav.map(item=>(
              <button key={item.id} onClick={()=>setView(item.id)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:view===item.id?"rgba(139,92,246,0.15)":"transparent",border:"none",borderRadius:8,color:view===item.id?"#c4b5fd":"#94a3b8",fontSize:13,fontWeight:view===item.id?600:400,cursor:"pointer",transition:"all 0.15s ease"}}>
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </div>
          {mandante&&<div style={{padding:"6px 14px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:8,fontSize:12,color:"#60a5fa",fontWeight:600}}>{mandante}</div>}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 24px"}}>
        {view==="upload"&&<UploadView onProcess={data=>{setResults(data);setView("dashboard");}} mandante={mandante} setMandante={setMandante} />}
        {view==="dashboard"&&<DashboardView results={results} mandante={mandante} />}
        {view==="estrategia"&&<EstrategiaView results={results} />}
        {view==="historico"&&<HistoricoView />}
      </div>

      <div style={{borderTop:"1px solid rgba(255,255,255,0.04)",padding:"16px 24px",textAlign:"center",fontSize:11,color:"#475569"}}>
        Orsan Cobranzas · Modelo industria_GB (AUC 0.9014) · {new Date().getFullYear()} · Cloud Run + Vertex AI + BigQuery
      </div>
    </div>
  );
}
