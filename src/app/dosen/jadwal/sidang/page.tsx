"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Edit2, X, Clock, Calendar,
  CheckCircle, XCircle, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, GraduationCap,
} from "lucide-react";

interface JadwalSidang {
  id: string;
  tanggal: string;
  waktuMulaiAvailable: string;
  waktuSelesaiAvailable: string;
  keterangan: string | null;
  status: "TERSEDIA" | "TERISI" | "DIBATALKAN";
  pendaftaranId: string | null;
  pendaftaran: {
    judulTA: string;
    mahasiswa: { user: { name: string } };
  } | null;
}

const statusConf = {
  TERSEDIA: { label: "Tersedia", cls: "badge-diterima", Icon: CheckCircle },
  TERISI: { label: "Terisi (Dijadwalkan)", cls: "badge-menunggu", Icon: GraduationCap },
  DIBATALKAN: { label: "Dibatalkan", cls: "badge-ditolak", Icon: XCircle },
} as const;

function getBulan(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatBulan(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function durasi(mulai: string, selesai: string) {
  const [hm, mm] = mulai.split(":").map(Number);
  const [hs, ms] = selesai.split(":").map(Number);
  const diff = (hs * 60 + ms) - (hm * 60 + mm);
  return `${diff} menit`;
}

export default function JadwalSidangPage() {
  const [bulan, setBulan] = useState(getBulan(new Date()));
  const [list, setList] = useState<JadwalSidang[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tanggal: "", waktuMulaiAvailable: "08:00", waktuSelesaiAvailable: "17:00", keterangan: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchJadwal = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/jadwal/sidang?bulan=${bulan}`);
    setList(await r.json());
    setLoading(false);
  }, [bulan]);

  useEffect(() => { fetchJadwal(); }, [fetchJadwal]);

  const changeBulan = (delta: number) => {
    const [y, m] = bulan.split("-").map(Number);
    setBulan(getBulan(new Date(y, m - 1 + delta, 1)));
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ tanggal: "", waktuMulaiAvailable: "08:00", waktuSelesaiAvailable: "17:00", keterangan: "" });
    setMsg(null);
    setShowForm(true);
  };

  const openEdit = (j: JadwalSidang) => {
    setEditId(j.id);
    setForm({
      tanggal: j.tanggal.split("T")[0],
      waktuMulaiAvailable: j.waktuMulaiAvailable,
      waktuSelesaiAvailable: j.waktuSelesaiAvailable,
      keterangan: j.keterangan || "",
    });
    setMsg(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.tanggal) return setMsg({ text: "Tanggal wajib diisi", type: "error" });
    setSaving(true); setMsg(null);
    try {
      const url = editId ? `/api/jadwal/sidang/${editId}` : "/api/jadwal/sidang";
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, keterangan: form.keterangan || undefined }),
      });
      const data = await r.json();
      if (!r.ok) return setMsg({ text: data.error, type: "error" });
      setMsg({ text: editId ? "Jadwal berhasil diperbarui" : "Jadwal sidang berhasil ditambahkan", type: "success" });
      fetchJadwal();
      setTimeout(() => setShowForm(false), 1000);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus ketersediaan sidang ini?")) return;
    await fetch(`/api/jadwal/sidang/${id}`, { method: "DELETE" });
    fetchJadwal();
  };

  const tersedia = list.filter(j => j.status === "TERSEDIA").length;
  const terisi = list.filter(j => j.status === "TERISI").length;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Jadwal Sidang</div>
          <div className="topbar-subtitle">Atur window ketersediaan Anda untuk sidang mahasiswa</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={15} /> Tambah Jadwal
        </button>
      </div>

      <div className="page-content">
        {/* Info banner */}
        <div className="card mb-6" style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.15)", padding: "14px 18px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertCircle size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text)" }}>Jadwal Sidang</strong> adalah jendela waktu (window) Anda tersedia untuk sidang tugas akhir.
              Misalnya: Senin 08:00–17:00 berarti Anda siap dihubungi untuk sidang sepanjang hari itu.
              Admin/koordinator dapat menggunakan data ini untuk menjadwalkan sidang mahasiswa.
            </p>
          </div>
        </div>

        {/* Navigasi bulan */}
        <div className="card mb-6" style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => changeBulan(-1)}><ChevronLeft size={15} /></button>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
              <Calendar size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              {formatBulan(bulan)}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => changeBulan(1)}><ChevronRight size={15} /></button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-3 mb-6">
          {[
            { label: "Total Hari", val: list.length, color: "var(--primary)", bg: "var(--primary-bg)" },
            { label: "Tersedia", val: tersedia, color: "var(--success)", bg: "var(--success-bg)" },
            { label: "Sudah Dijadwalkan", val: terisi, color: "var(--warning)", bg: "var(--warning-bg)" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <Calendar size={20} color={s.color} />
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : list.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Calendar size={48} /></div>
              <h3 className="empty-state-title">Belum Ada Jadwal Sidang</h3>
              <p className="empty-state-desc">Tambahkan ketersediaan Anda untuk sidang di bulan {formatBulan(bulan)}</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                <Plus size={16} /> Tambah Jadwal
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map(j => {
              const conf = statusConf[j.status];
              const SIcon = conf.Icon;
              return (
                <div key={j.id} className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* Tanggal box */}
                    <div style={{
                      width: 56, flexShrink: 0, textAlign: "center",
                      background: j.status === "TERSEDIA" ? "var(--success-bg)" : j.status === "TERISI" ? "var(--warning-bg)" : "var(--danger-bg)",
                      borderRadius: 10, padding: "8px 4px",
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {new Date(j.tanggal).toLocaleDateString("id-ID", { weekday: "short" })}
                      </p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
                        {new Date(j.tanggal).getDate()}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {new Date(j.tanggal).toLocaleDateString("id-ID", { month: "short" })}
                      </p>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                          {formatTanggal(j.tanggal)}
                        </span>
                        <span className={`badge ${conf.cls}`}><SIcon size={11} /> {conf.label}</span>
                      </div>

                      {/* Window waktu */}
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        background: "var(--bg)", borderRadius: 8, padding: "7px 14px",
                        border: "1px solid var(--border)", marginBottom: j.keterangan || j.pendaftaran ? 8 : 0,
                      }}>
                        <Clock size={14} color="var(--primary)" />
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
                          {j.waktuMulaiAvailable}
                        </span>
                        <span style={{ color: "var(--text-dim)" }}>–</span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
                          {j.waktuSelesaiAvailable}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-dim)", borderLeft: "1px solid var(--border)", paddingLeft: 8 }}>
                          {durasi(j.waktuMulaiAvailable, j.waktuSelesaiAvailable)}
                        </span>
                      </div>

                      {j.pendaftaran && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 13, color: "var(--warning)" }}>
                          <GraduationCap size={13} />
                          <span><strong>{j.pendaftaran.mahasiswa.user.name}</strong> — {j.pendaftaran.judulTA.slice(0, 50)}...</span>
                        </div>
                      )}
                      {j.keterangan && (
                        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{j.keterangan}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(j)}><Edit2 size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(j.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {editId ? "Edit Ketersediaan Sidang" : "Tambah Ketersediaan Sidang"}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>

            {msg && (
              <div className={`alert alert-${msg.type}`}>
                {msg.type === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                <span>{msg.text}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Tanggal <span className="required">*</span></label>
              <input type="date" className="form-input" value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
              <p className="form-hint">Satu tanggal hanya dapat memiliki satu window ketersediaan sidang</p>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tersedia Mulai <span className="required">*</span></label>
                <input type="time" className="form-input" value={form.waktuMulaiAvailable}
                  onChange={e => setForm(f => ({ ...f, waktuMulaiAvailable: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Tersedia Sampai <span className="required">*</span></label>
                <input type="time" className="form-input" value={form.waktuSelesaiAvailable}
                  onChange={e => setForm(f => ({ ...f, waktuSelesaiAvailable: e.target.value }))} />
              </div>
            </div>

            {/* Preview durasi */}
            {form.waktuMulaiAvailable < form.waktuSelesaiAvailable && (
              <div style={{ background: "var(--primary-bg)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--primary)" }}>
                <Clock size={14} style={{ display: "inline", marginRight: 6 }} />
                Window ketersediaan: <strong>{form.waktuMulaiAvailable} – {form.waktuSelesaiAvailable}</strong>
                {" "}({durasi(form.waktuMulaiAvailable, form.waktuSelesaiAvailable)})
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Keterangan <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(Opsional)</span></label>
              <input type="text" className="form-input" placeholder="Ruangan, catatan khusus, dll..." value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={15} />}
                {saving ? "Menyimpan..." : editId ? "Perbarui" : "Simpan Jadwal"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
