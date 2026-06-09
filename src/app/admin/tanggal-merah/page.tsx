"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, AlertCircle, Loader2
} from "lucide-react";

interface TanggalMerah {
  id: string;
  tanggal: string;
  judul: string;
  keterangan: string | null;
  groupId: string | null;
}

const DAYS = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function getBulan(d:Date){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function toKey(d:Date){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function toISO(d:Date){ return d.toISOString().split("T")[0]; }

export default function AdminTanggalMerahPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cur, setCur] = useState(new Date());
  const [list, setList] = useState<TanggalMerah[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<string|null>(null);

  // Form add/edit
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [mode, setMode] = useState<"single" | "range">("single"); // "single" or "range"
  const [form, setForm] = useState({
    tanggal: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    judul: "",
    ket: ""
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const bulanStr = getBulan(cur);

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const fetch_ = useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    setLoading(true);
    try {
      const r = await fetch(`/api/tanggal-merah?bulan=${bulanStr}`);
      if (r.ok) {
        const data = await r.json();
        setList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bulanStr, status, session]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch_();
    }, 0);
    return () => clearTimeout(t);
  }, [fetch_]);

  const nav = (d: number) => {
    const n = new Date(cur);
    n.setMonth(n.getMonth() + d);
    setCur(n);
    setSel(null);
  };

  // Calendar grid (Mon-first)
  const { y, m } = { y: cur.getFullYear(), m: cur.getMonth() };
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: Array<Date | null> = [...Array(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1))];
  while (cells.length % 7 !== 0) cells.push(null);

  // Group by day
  const tmByDay = list.reduce<Record<string, TanggalMerah>>((a, j) => {
    const k = j.tanggal.split("T")[0];
    a[k] = j;
    return a;
  }, {});

  const selTM = sel ? tmByDay[sel] || null : null;

  // Mendapatkan detail range holiday jika item memiliki groupId
  const selTMRangeInfo = (() => {
    if (!selTM || !selTM.groupId) return null;
    const groupItems = list.filter(x => x.groupId === selTM.groupId).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    if (groupItems.length === 0) return null;
    const start = new Date(groupItems[0].tanggal);
    const end = new Date(groupItems[groupItems.length - 1].tanggal);
    return {
      startStr: start.toLocaleDateString("id-ID", { day: "numeric", month: "long" }),
      endStr: end.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      count: groupItems.length
    };
  })();

  const openAdd = () => {
    setEditId(null);
    setMode("single");
    setErr("");
    setForm({
      tanggal: sel || toISO(new Date()),
      tanggalMulai: sel || toISO(new Date()),
      tanggalSelesai: sel || toISO(new Date()),
      judul: "",
      ket: "",
    });
    setShowAdd(true);
  };

  const openEdit = (item: TanggalMerah) => {
    setEditId(item.id);
    setMode("single"); // edit di-restrict ke metadata saja jika range
    setErr("");
    setForm({
      tanggal: item.tanggal.split("T")[0],
      tanggalMulai: item.tanggal.split("T")[0],
      tanggalSelesai: item.tanggal.split("T")[0],
      judul: item.judul,
      ket: item.keterangan || "",
    });
    setShowAdd(true);
  };

  const save = async () => {
    const isRange = mode === "range" && !editId;
    if (isRange) {
      if (!form.tanggalMulai || !form.tanggalSelesai || !form.judul) {
        setErr("Judul, Tanggal Mulai dan Tanggal Selesai wajib diisi");
        return;
      }
    } else {
      if (!form.tanggal || !form.judul) {
        setErr("Tanggal dan Judul wajib diisi");
        return;
      }
    }

    setSaving(true);
    setErr("");
    try {
      const url = editId ? `/api/tanggal-merah/${editId}` : "/api/tanggal-merah";
      const method = editId ? "PATCH" : "POST";
      
      const payload = editId
        ? {
            tanggal: form.tanggal,
            judul: form.judul,
            keterangan: form.ket || null,
          }
        : mode === "range"
        ? {
            tanggalMulai: form.tanggalMulai,
            tanggalSelesai: form.tanggalSelesai,
            judul: form.judul,
            keterangan: form.ket || null,
          }
        : {
            tanggal: form.tanggal,
            judul: form.judul,
            keterangan: form.ket || null,
          };

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.error || "Gagal menyimpan");
        return;
      }
      setShowAdd(false);
      setSel(mode === "range" && !editId ? form.tanggalMulai : form.tanggal);
      fetch_();
    } catch (e) {
      console.error(e);
      setErr("Terjadi kesalahan server");
    } finally {
      setSaving(false);
    }
  };

  const delTM = async (id: string) => {
    const confirmMsg = selTM?.groupId 
      ? "Agenda ini adalah bagian dari libur panjang/rentang. Menghapus agenda ini akan menghapus SELURUH hari pada rentang libur ini. Lanjutkan?"
      : "Apakah Anda yakin ingin menghapus tanggal merah / agenda akademik ini?";
      
    if (!confirm(confirmMsg)) return;
    try {
      const r = await fetch(`/api/tanggal-merah/${id}`, { method: "DELETE" });
      if (r.ok) {
        setSel(null);
        fetch_();
      } else {
        const d = await r.json();
        alert(d.error || "Gagal menghapus");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const today = toKey(new Date());

  if (status === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Kalender Akademik</div>
          <div className="topbar-subtitle">Kelola tanggal merah & libur akademik universitas</div>
        </div>
      </div>

      <div className="page-content" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* ── CALENDAR PANEL ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Month nav */}
          <div className="card mb-4" style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => nav(-1)}><ChevronLeft size={15} /></button>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>{MONTHS[m]} {y}</h2>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                  {list.length} hari libur / agenda akademik terdaftar
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => nav(1)}><ChevronRight size={15} /></button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12, padding: "0 2px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#EF4444", display: "inline-block" }} />
              Libur Akademik / Tanggal Merah
            </div>
            {loading && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />Memuat...</div>}
          </div>

          {/* Grid */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)" }}>
              {DAYS.map(d => (
                <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {cells.map((date, i) => {
                if (!date) return <div key={`e${i}`} style={{ minHeight: 88, borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg)" }} />;
                const key = toKey(date);
                const dayTM = tmByDay[key] || null;
                const isToday = key === today;
                const isSel = key === sel;

                return (
                  <div key={key} onClick={() => setSel(isSel ? null : key)}
                    style={{
                      minHeight: 88, padding: "7px 5px",
                      borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                      cursor: "pointer", transition: "background 0.12s",
                      background: dayTM ? "rgba(239,68,68,0.03)" : isSel ? "rgba(124,58,237,0.05)" : "white",
                      position: "relative",
                    }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = dayTM ? "rgba(239,68,68,0.06)" : "var(--bg-hover)"; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = dayTM ? "rgba(239,68,68,0.03)" : "white"; }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: isToday || isSel || dayTM ? 700 : 400, marginBottom: 3,
                      background: dayTM ? "#EF4444" : isToday ? "var(--primary)" : isSel ? "var(--primary-bg)" : "transparent",
                      color: dayTM || isToday ? "white" : isSel ? "var(--primary)" : "var(--text)",
                    }}>{date.getDate()}</div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {dayTM && (
                        <div style={{
                          background: "rgba(239,68,68,0.12)", borderLeft: "2px solid #EF4444",
                          borderRadius: "0 3px 3px 0", padding: "1px 4px",
                          fontSize: 10, color: "#DC2626", fontWeight: 700,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }} title={dayTM.judul}>
                          🔴 {dayTM.judul}
                        </div>
                      )}
                    </div>

                    {dayTM && !isSel && (
                      <div style={{ position: "absolute", bottom: 4, right: 5, display: "flex", gap: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444" }} />
                      </div>
                    )}
                    {isSel && <div style={{ position: "absolute", inset: 0, border: "2px solid var(--primary)", pointerEvents: "none" }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SIDE PANEL ── */}
        {sel ? (
          <div style={{ width: 310, flexShrink: 0, animation: "fadeInUp 0.2s ease" }}>
            <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 80 }}>
              {/* Header */}
              <div style={{ padding: "14px 16px", background: selTM ? "linear-gradient(135deg,#FEF2F2,#FEE2E2)" : "linear-gradient(135deg,var(--primary-bg),#EFF6FF)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: selTM ? "#991B1B" : "var(--text)" }}>
                    {new Date(sel + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p style={{ fontSize: 11, color: selTM ? "#C53030" : "var(--text-muted)", marginTop: 2 }}>
                    {selTM ? (selTM.groupId ? "Libur Panjang (Rentang)" : "Tanggal Merah / Libur") : "Belum ada agenda akademik"}
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSel(null)}><X size={14} /></button>
              </div>

              {selTM ? (
                <div style={{ padding: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: "1px solid #FCA5A5" }}>
                    <span style={{ fontSize: 20 }}>🔴</span>
                  </div>
                  <h4 style={{ fontWeight: 800, color: "#991B1B", fontSize: 15, textAlign: "center" }}>{selTM.judul}</h4>
                  
                  {selTMRangeInfo ? (
                    <div style={{ background: "rgba(239,68,68,0.05)", borderRadius: 8, padding: "10px 12px", marginTop: 10, border: "1px solid rgba(239,68,68,0.15)", fontSize: 12, color: "#991B1B" }}>
                      <p style={{ fontWeight: 700, marginBottom: 2 }}>Rentang Libur:</p>
                      <p>{selTMRangeInfo.startStr} s/d {selTMRangeInfo.endStr}</p>
                      <p style={{ fontSize: 11, color: "#C53030", marginTop: 4 }}>Durasi: <strong>{selTMRangeInfo.count} hari</strong></p>
                    </div>
                  ) : null}

                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.5, textAlign: "center" }}>
                    {selTM.keterangan || "Libur nasional atau agenda akademik universitas."}
                  </p>

                  <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                    <button className="btn btn-secondary btn-full btn-sm" onClick={() => openEdit(selTM)}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button className="btn btn-danger btn-full btn-sm" onClick={() => delTM(selTM.id)}>
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Plus size={20} color="var(--primary)" />
                  </div>
                  <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Hari Aktif</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Belum ada agenda libur akademik atau tanggal merah terdaftar.</p>
                  <button className="btn btn-primary btn-full btn-sm" onClick={openAdd}>
                    <Plus size={13} /> Tambah Agenda
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ width: 310, flexShrink: 0 }}>
            <div className="card" style={{ textAlign: "center", padding: 36, border: "2px dashed var(--border)", background: "transparent" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <ChevronRight size={22} color="var(--primary)" />
              </div>
              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Pilih Tanggal</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Klik tanggal di kalender untuk mengelola tanggal merah</p>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ADD/EDIT ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {editId ? "Edit Agenda Akademik" : "Tambah Agenda Akademik"}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={15} /></button>
            </div>

            {err && <div className="alert alert-error" style={{ marginBottom: 14 }}><AlertCircle size={14} /><span>{err}</span></div>}

            {/* Mode Selector (hanya jika add baru) */}
            {!editId && (
              <div style={{ display: "flex", background: "var(--bg)", borderRadius: 8, padding: 3, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  style={{
                    flex: 1, padding: "6px 10px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
                    background: mode === "single" ? "white" : "transparent",
                    color: mode === "single" ? "var(--primary)" : "var(--text-muted)",
                    boxShadow: mode === "single" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                  }}
                >
                  Satu Hari
                </button>
                <button
                  type="button"
                  onClick={() => setMode("range")}
                  style={{
                    flex: 1, padding: "6px 10px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
                    background: mode === "range" ? "white" : "transparent",
                    color: mode === "range" ? "var(--primary)" : "var(--text-muted)",
                    boxShadow: mode === "range" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                  }}
                >
                  Rentang Tanggal (Libur Panjang)
                </button>
              </div>
            )}

            {editId || mode === "single" ? (
              <div className="form-group">
                <label className="form-label">Tanggal <span className="required">*</span></label>
                <input type="date" className="form-input" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
            ) : (
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Mulai Tanggal <span className="required">*</span></label>
                  <input type="date" className="form-input" value={form.tanggalMulai} onChange={e => setForm(f => ({ ...f, tanggalMulai: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Selesai Tanggal <span className="required">*</span></label>
                  <input type="date" className="form-input" value={form.tanggalSelesai} onChange={e => setForm(f => ({ ...f, tanggalSelesai: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nama Libur / Agenda <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="Misal: Libur Idul Fitri, Cuti Bersama" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(Opsional)</span></label>
              <input type="text" className="form-input" placeholder="Catatan tambahan agenda..." value={form.ket} onChange={e => setForm(f => ({ ...f, ket: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
                {saving ? "Menyimpan..." : editId ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}
