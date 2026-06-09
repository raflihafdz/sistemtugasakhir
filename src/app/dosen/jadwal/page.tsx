"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Clock, AlertCircle, Loader2 } from "lucide-react";

interface JB { id:string; tanggal:string; waktuMulai:string; waktuSelesai:string; keterangan:string|null; status:string; mahasiswa:{user:{name:string}}|null; }
interface JS { id:string; tanggal:string; waktuMulaiAvailable:string; waktuSelesaiAvailable:string; keterangan:string|null; status:string; pendaftaran:{judulTA:string;mahasiswa:{user:{name:string}}}|null; }
interface TM { id:string; tanggal:string; judul:string; keterangan:string|null; }

const DAYS = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function getBulan(d:Date){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function toKey(d:Date){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function toISO(d:Date){ return d.toISOString().split("T")[0]; }
function dur(a:string,b:string){
  const[ah,am]=a.split(":").map(Number); const[bh,bm]=b.split(":").map(Number);
  const d=(bh*60+bm)-(ah*60+am);
  return d>=60?`${Math.floor(d/60)}j${d%60?` ${d%60}m`:""}`:` ${d}m`;
}

const BADGE_B = { bg:"rgba(124,58,237,0.12)", border:"#7C3AED", text:"#6D28D9" };
const BADGE_S = { bg:"rgba(217,119,6,0.12)", border:"#D97706", text:"#B45309" };

export default function JadwalPage(){
  const [cur, setCur] = useState(new Date());
  const [bList, setBList] = useState<JB[]>([]);
  const [sList, setSList] = useState<JS[]>([]);
  const [tMerah, setTMerah] = useState<TM[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<string|null>(null);
  const [tab, setTab] = useState<"bimbingan"|"sidang">("bimbingan");

  // Form add
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"bimbingan"|"sidang">("bimbingan");
  const [form, setForm] = useState({ tanggal:"", wm:"08:00", ws:"09:00", wma:"08:00", wsa:"10:00", ket:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const bulanStr = getBulan(cur);

  const fetch_ = useCallback(async()=>{
    setLoading(true);
    try {
      const [rb,rs,rt] = await Promise.all([
        fetch(`/api/jadwal/bimbingan?bulan=${bulanStr}`).then(r=>r.json()),
        fetch(`/api/jadwal/sidang?bulan=${bulanStr}`).then(r=>r.json()),
        fetch(`/api/tanggal-merah?bulan=${bulanStr}`).then(r=>r.json()),
      ]);
      setBList(Array.isArray(rb)?rb:[]);
      setSList(Array.isArray(rs)?rs:[]);
      setTMerah(Array.isArray(rt)?rt:[]);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  },[bulanStr]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch_();
    }, 0);
    return () => clearTimeout(t);
  }, [fetch_]);

  const nav=(d:number)=>{ const n=new Date(cur); n.setMonth(n.getMonth()+d); setCur(n); setSel(null); };

  // Calendar grid (Mon-first)
  const {y,m} = {y:cur.getFullYear(),m:cur.getMonth()};
  const startDow = (new Date(y,m,1).getDay()+6)%7;
  const daysInMonth = new Date(y,m+1,0).getDate();
  const cells:Array<Date|null> = [...Array(startDow).fill(null),...Array.from({length:daysInMonth},(_,i)=>new Date(y,m,i+1))];
  while(cells.length%7!==0) cells.push(null);

  // Group by day
  const bByDay = bList.reduce<Record<string,JB[]>>((a,j)=>{ const k=j.tanggal.split("T")[0]; (a[k]=a[k]||[]).push(j); return a; },{});
  const sByDay = sList.reduce<Record<string,JS[]>>((a,j)=>{ const k=j.tanggal.split("T")[0]; (a[k]=a[k]||[]).push(j); return a; },{});
  const tmByDay = tMerah.reduce<Record<string,TM>>((a,j)=>{ const k=j.tanggal.split("T")[0]; a[k]=j; return a; },{});

  const selBList = sel ? (bByDay[sel]||[]) : [];
  const selSList = sel ? (sByDay[sel]||[]).sort((a,b)=>a.waktuMulaiAvailable.localeCompare(b.waktuMulaiAvailable)) : [];
  const selTM = sel ? tmByDay[sel]||null : null;

  const openAdd=(type:"bimbingan"|"sidang")=>{
    if (selTM) return; // Prevent action if today is holiday
    setAddType(type); setErr("");
    const nextHour = selSList.length>0 ? selSList[selSList.length-1].waktuSelesaiAvailable : "08:00";
    const [h,mm_] = nextHour.split(":").map(Number);
    const nxt = `${String(h+1).padStart(2,"0")}:${String(mm_).padStart(2,"0")}`;
    const nxt2 = `${String(h+2).padStart(2,"0")}:${String(mm_).padStart(2,"0")}`;
    setForm({ tanggal:sel||toISO(new Date()), wm:"08:00", ws:"09:00", wma: h+1<24?nxt:"08:00", wsa: h+2<24?nxt2:"09:00", ket:"" });
    setShowAdd(true);
  };

  const save=async()=>{
    setSaving(true); setErr("");
    try{
      const url=addType==="bimbingan"?"/api/jadwal/bimbingan":"/api/jadwal/sidang";
      const body=addType==="bimbingan"
        ?{tanggal:form.tanggal,waktuMulai:form.wm,waktuSelesai:form.ws,keterangan:form.ket||undefined}
        :{tanggal:form.tanggal,waktuMulaiAvailable:form.wma,waktuSelesaiAvailable:form.wsa,keterangan:form.ket||undefined};
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok){ setErr(d.error); return; }
      setShowAdd(false); setSel(form.tanggal); fetch_();
    }finally{ setSaving(false); }
  };

  const delB=async(id:string)=>{ if(!confirm("Hapus sesi bimbingan ini?"))return; await fetch(`/api/jadwal/bimbingan/${id}`,{method:"DELETE"}); fetch_(); };
  const delS=async(id:string)=>{ if(!confirm("Hapus sesi sidang ini?"))return; await fetch(`/api/jadwal/sidang/${id}`,{method:"DELETE"}); fetch_(); };

  const today = toKey(new Date());

  return(
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Jadwal Saya</div>
          <div className="topbar-subtitle">Kelola sesi bimbingan dan ketersediaan sidang dalam satu tampilan</div>
        </div>
      </div>

      <div className="page-content" style={{display:"flex",gap:20,alignItems:"flex-start"}}>
        {/* ── CALENDAR PANEL ── */}
        <div style={{flex:1,minWidth:0}}>
          {/* Month nav */}
          <div className="card mb-4" style={{padding:"14px 20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <button className="btn btn-secondary btn-sm" onClick={()=>nav(-1)}><ChevronLeft size={15}/></button>
              <div style={{textAlign:"center"}}>
                <h2 style={{fontWeight:800,fontSize:17,color:"var(--text)"}}>{MONTHS[m]} {y}</h2>
                <p style={{fontSize:11,color:"var(--text-muted)",marginTop:1}}>
                  {bList.length} sesi bimbingan · {sList.length} sesi sidang
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={()=>nav(1)}><ChevronRight size={15}/></button>
            </div>
          </div>

          {/* Legend */}
          <div style={{display:"flex",gap:16,marginBottom:12,padding:"0 2px",flexWrap:"wrap"}}>
            {[{c:"#7C3AED",l:"Bimbingan"},{c:"#D97706",l:"Sidang"},{c:"#EF4444",l:"Libur Akademik"}].map(({c,l})=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)"}}>
                <span style={{width:10,height:10,borderRadius:3,background:c,display:"inline-block"}}/>
                {l}
              </div>
            ))}
            {loading && <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-dim)"}}><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>Memuat...</div>}
          </div>

          {/* Grid */}
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid var(--border)"}}>
              {DAYS.map(d=>(
                <div key={d} style={{padding:"10px 0",textAlign:"center",fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{d}</div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
              {cells.map((date,i)=>{
                if(!date) return <div key={`e${i}`} style={{minHeight:88,borderRight:"1px solid var(--border)",borderBottom:"1px solid var(--border)",background:"var(--bg)"}}/>;
                const key=toKey(date);
                const dayB=bByDay[key]||[];
                const dayS=sByDay[key]||[];
                const dayTM=tmByDay[key]||null;
                const isToday=key===today;
                const isSel=key===sel;
                const hasEvents=dayB.length>0||dayS.length>0||dayTM!==null;

                return(
                  <div key={key} onClick={()=>setSel(isSel?null:key)}
                    style={{
                      minHeight:88,padding:"7px 5px",
                      borderRight:"1px solid var(--border)",borderBottom:"1px solid var(--border)",
                      cursor:"pointer",transition:"background 0.12s",
                      background: dayTM ? "rgba(239,68,68,0.03)" : isSel?"rgba(124,58,237,0.05)":"white",
                      position:"relative",
                    }}
                    onMouseEnter={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background=dayTM?"rgba(239,68,68,0.06)":"var(--bg-hover)";}}
                    onMouseLeave={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background=dayTM?"rgba(239,68,68,0.03)":"white";}}
                  >
                    <div style={{
                      width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,fontWeight:isToday||isSel||dayTM?700:400,marginBottom:3,
                      background:dayTM?"#EF4444":isToday?"var(--primary)":isSel?"var(--primary-bg)":"transparent",
                      color:dayTM||isToday?"white":isSel?"var(--primary)":"var(--text)",
                    }}>{date.getDate()}</div>

                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {/* Tanggal Merah Banner */}
                      {dayTM && (
                        <div style={{
                          background:"rgba(239,68,68,0.12)",borderLeft:"2px solid #EF4444",
                          borderRadius:"0 3px 3px 0",padding:"1px 4px",
                          fontSize:9,color:"#DC2626",fontWeight:700,
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        }} title={dayTM.judul}>
                          🔴 {dayTM.judul}
                        </div>
                      )}

                      {/* Bimbingan chips */}
                      {dayB.slice(0,2).map(b=>(
                        <div key={b.id} style={{
                          background:BADGE_B.bg,borderLeft:`2px solid ${BADGE_B.border}`,
                          borderRadius:"0 3px 3px 0",padding:"1px 4px",
                          fontSize:10,color:BADGE_B.text,fontWeight:600,
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        }}>{b.waktuMulai}–{b.waktuSelesai}</div>
                      ))}
                      {dayB.length>2 && <div style={{fontSize:9,color:"var(--text-dim)",paddingLeft:4}}>+{dayB.length-2} bimbingan</div>}
                      
                      {/* Sidang chips */}
                      {dayS.slice(0,2).map(s=>(
                        <div key={s.id} style={{
                          background:BADGE_S.bg,borderLeft:`2px solid ${BADGE_S.border}`,
                          borderRadius:"0 3px 3px 0",padding:"1px 4px",
                          fontSize:10,color:BADGE_S.text,fontWeight:600,
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        }}>⚖ {s.waktuMulaiAvailable}–{s.waktuSelesaiAvailable}</div>
                      ))}
                      {dayS.length>2 && <div style={{fontSize:9,color:"var(--text-dim)",paddingLeft:4}}>+{dayS.length-2} sidang</div>}
                    </div>

                    {/* dot indicator */}
                    {hasEvents&&!isSel&&(
                      <div style={{position:"absolute",bottom:4,right:5,display:"flex",gap:2}}>
                        {dayB.length>0&&<span style={{width:5,height:5,borderRadius:"50%",background:"#7C3AED"}}/>}
                        {dayS.length>0&&<span style={{width:5,height:5,borderRadius:"50%",background:"#D97706"}}/>}
                        {dayTM!==null&&<span style={{width:5,height:5,borderRadius:"50%",background:"#EF4444"}}/>}
                      </div>
                    )}
                    {isSel&&<div style={{position:"absolute",inset:0,border:"2px solid var(--primary)",pointerEvents:"none"}}/>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SIDE PANEL ── */}
        {sel?(
          <div style={{width:310,flexShrink:0,animation:"fadeInUp 0.2s ease"}}>
            <div className="card" style={{padding:0,overflow:"hidden",position:"sticky",top:80}}>
              {/* Header */}
              <div style={{padding:"14px 16px",background:selTM ? "linear-gradient(135deg,#FEF2F2,#FEE2E2)" : "linear-gradient(135deg,var(--primary-bg),#EFF6FF)",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <p style={{fontWeight:700,fontSize:14,color:selTM ? "#991B1B" : "var(--text)"}}>
                    {new Date(sel+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                  </p>
                  <p style={{fontSize:11,color:selTM ? "#C53030" : "var(--text-muted)",marginTop:2}}>
                    {selTM ? "Tanggal Merah / Libur" : `${selBList.length} bimbingan · ${selSList.length} sesi sidang`}
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={()=>setSel(null)}><X size={14}/></button>
              </div>

              {selTM ? (
                <div style={{padding:20,textAlign:"center"}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",border:"1px solid #FCA5A5"}}>
                    <span style={{fontSize:20}}>🔴</span>
                  </div>
                  <h4 style={{fontWeight:800,color:"#991B1B",fontSize:15}}>{selTM.judul}</h4>
                  <p style={{fontSize:13,color:"var(--text-muted)",marginTop:6,lineHeight:1.5}}>
                    {selTM.keterangan || "Libur nasional atau agenda akademik universitas."}
                  </p>
                  <div style={{marginTop:16,padding:"10px 12px",background:"#FEF2F2",borderRadius:8,fontSize:12,color:"#991B1B",border:"1px dashed #FCA5A5"}}>
                    Dosen tidak dapat mengatur atau menambahkan jadwal pada hari libur akademik.
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid var(--border)"}}>
                    {(["bimbingan","sidang"] as const).map(t=>(
                      <button key={t} onClick={()=>setTab(t)} style={{
                        padding:"10px 8px",fontWeight:600,fontSize:12,border:"none",cursor:"pointer",transition:"all 0.15s",
                        background:tab===t?"white":"var(--bg)",
                        color:tab===t?"var(--primary)":"var(--text-muted)",
                        borderBottom:tab===t?"2px solid var(--primary)":"2px solid transparent",
                      }}>
                        {t==="bimbingan"?"🟣 Bimbingan":"🟡 Sidang"}
                        <span style={{
                          marginLeft:5,background:t==="bimbingan"?"var(--primary-bg)":"var(--warning-bg)",
                          color:t==="bimbingan"?"var(--primary)":"var(--warning)",
                          borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700,
                        }}>
                          {t==="bimbingan"?selBList.length:selSList.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div style={{padding:14,maxHeight:"55vh",overflowY:"auto"}}>
                    {tab==="bimbingan"?(
                      <>
                        {selBList.length===0?(
                          <p style={{textAlign:"center",color:"var(--text-muted)",fontSize:13,padding:"18px 0"}}>Belum ada sesi bimbingan</p>
                        ):(
                          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                            {selBList.map(b=>(
                              <div key={b.id} style={{background:"var(--bg)",borderRadius:8,padding:"9px 11px",border:"1px solid var(--border)",display:"flex",alignItems:"flex-start",gap:9}}>
                                <div style={{width:3,alignSelf:"stretch",borderRadius:4,background:"#7C3AED",flexShrink:0}}/>
                                <div style={{flex:1}}>
                                  <p style={{fontWeight:700,fontSize:13,color:"var(--text)"}}>{b.waktuMulai} – {b.waktuSelesai}</p>
                                  <p style={{fontSize:11,color:"var(--text-dim)"}}>{dur(b.waktuMulai,b.waktuSelesai)}</p>
                                  {b.mahasiswa&&<p style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>👤 {b.mahasiswa.user.name}</p>}
                                  {b.keterangan&&<p style={{fontSize:11,color:"var(--text-dim)",marginTop:2}}>{b.keterangan}</p>}
                                </div>
                                <button className="btn btn-danger btn-sm" style={{padding:"3px 7px",flexShrink:0}} onClick={()=>delB(b.id)}><Trash2 size={11}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="btn btn-primary btn-full btn-sm" onClick={()=>openAdd("bimbingan")}>
                          <Plus size={13}/> Tambah Sesi Bimbingan
                        </button>
                      </>
                    ):(
                      <>
                        {selSList.length===0?(
                          <p style={{textAlign:"center",color:"var(--text-muted)",fontSize:13,padding:"18px 0"}}>Belum ada sesi sidang</p>
                        ):(
                          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                            {selSList.map((s,idx)=>(
                              <div key={s.id} style={{background:"rgba(217,119,6,0.05)",borderRadius:8,padding:"9px 11px",border:"1px solid rgba(217,119,6,0.2)",display:"flex",alignItems:"flex-start",gap:9}}>
                                <div style={{width:3,alignSelf:"stretch",borderRadius:4,background:"#D97706",flexShrink:0}}/>
                                <div style={{flex:1}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                                    <span style={{fontSize:10,fontWeight:700,background:"rgba(217,119,6,0.15)",color:"#B45309",borderRadius:4,padding:"1px 5px"}}>Sesi {idx+1}</span>
                                    <span style={{
                                      fontSize:10,fontWeight:600,
                                      color:s.status==="TERSEDIA"?"var(--success)":s.status==="TERISI"?"var(--warning)":"var(--danger)",
                                    }}>{s.status}</span>
                                  </div>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <Clock size={12} color="#D97706"/>
                                    <span style={{fontWeight:700,fontSize:13,color:"#B45309"}}>{s.waktuMulaiAvailable} – {s.waktuSelesaiAvailable}</span>
                                  </div>
                                  <p style={{fontSize:11,color:"var(--text-dim)",marginTop:1}}>{dur(s.waktuMulaiAvailable,s.waktuSelesaiAvailable)}</p>
                                  {s.pendaftaran&&(
                                    <p style={{fontSize:11,color:"var(--warning)",marginTop:2,fontWeight:600}}>
                                      📌 {s.pendaftaran.mahasiswa.user.name}
                                    </p>
                                  )}
                                  {s.keterangan&&<p style={{fontSize:11,color:"var(--text-dim)",marginTop:2}}>{s.keterangan}</p>}
                                </div>
                                <button className="btn btn-danger btn-sm" style={{padding:"3px 7px",flexShrink:0}} onClick={()=>delS(s.id)}><Trash2 size={11}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="btn btn-primary btn-full btn-sm" onClick={()=>openAdd("sidang")}>
                          <Plus size={13}/> Tambah Sesi Sidang
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ):(
          <div style={{width:310,flexShrink:0}}>
            <div className="card" style={{textAlign:"center",padding:36,border:"2px dashed var(--border)",background:"transparent"}}>
              <div style={{width:44,height:44,borderRadius:12,background:"var(--primary-bg)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                <ChevronRight size={22} color="var(--primary)"/>
              </div>
              <p style={{fontWeight:600,color:"var(--text)",marginBottom:4}}>Pilih Tanggal</p>
              <p style={{fontSize:13,color:"var(--text-muted)"}}>Klik tanggal di kalender untuk melihat dan mengelola jadwal</p>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL TAMBAH ── */}
      {showAdd&&(
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <h3 className="modal-title" style={{margin:0}}>
                {addType==="bimbingan"?"Tambah Sesi Bimbingan":"Tambah Sesi Sidang"}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowAdd(false)}><X size={15}/></button>
            </div>

            {err&&<div className="alert alert-error"><AlertCircle size={14}/><span>{err}</span></div>}

            {/* ── Jam yang sudah terpakai di tanggal ini ── */}
            {form.tanggal&&(()=> {
              const bOccupied = (bByDay[form.tanggal]||[]).map(b=>({label:`Bimbingan ${b.waktuMulai}–${b.waktuSelesai}`,color:"#7C3AED",bg:"rgba(124,58,237,0.1)"}));
              const sOccupied = (sByDay[form.tanggal]||[]).map(s=>({label:`Sidang ${s.waktuMulaiAvailable}–${s.waktuSelesaiAvailable}`,color:"#D97706",bg:"rgba(217,119,6,0.1)"}));
              const all=[...bOccupied,...sOccupied];
              if(all.length===0) return null;
              return(
                <div style={{marginBottom:14,padding:"10px 12px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>
                    ⛔ Jam yang sudah terisi di {new Date(form.tanggal+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long"})}
                  </p>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {all.map((a,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 9px",borderRadius:6,background:a.bg,border:`1px solid ${a.color}22`}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:a.color,flexShrink:0}}/>
                        <span style={{fontSize:12,color:a.color,fontWeight:600}}>{a.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="form-group">
              <label className="form-label">Tanggal <span className="required">*</span></label>
              <input type="date" className="form-input" value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))}/>
            </div>

            {addType==="bimbingan"?(
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Mulai <span className="required">*</span></label>
                  <input type="time" className="form-input" value={form.wm} onChange={e=>setForm(f=>({...f,wm:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Selesai <span className="required">*</span></label>
                  <input type="time" className="form-input" value={form.ws} onChange={e=>setForm(f=>({...f,ws:e.target.value}))}/>
                </div>
              </div>
            ):(
              <>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Mulai Tersedia <span className="required">*</span></label>
                    <input type="time" className="form-input" value={form.wma} onChange={e=>setForm(f=>({...f,wma:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selesai <span className="required">*</span></label>
                    <input type="time" className="form-input" value={form.wsa} onChange={e=>setForm(f=>({...f,wsa:e.target.value}))}/>
                  </div>
                </div>
                {form.wma<form.wsa&&(
                  <div style={{background:"rgba(217,119,6,0.08)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#B45309",display:"flex",alignItems:"center",gap:6}}>
                    <Clock size={12}/> <strong>{form.wma} – {form.wsa}</strong> ({dur(form.wma,form.wsa)})
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label className="form-label">Keterangan <span style={{color:"var(--text-dim)",fontWeight:400}}>(Opsional)</span></label>
              <input type="text" className="form-input" placeholder={addType==="bimbingan"?"Lokasi, topik...":"Ruangan, catatan..."} value={form.ket} onChange={e=>setForm(f=>({...f,ket:e.target.value}))}/>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowAdd(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<Plus size={14}/>}
                {saving?"Menyimpan...":"Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}
