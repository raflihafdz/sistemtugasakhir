"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Trash2, Edit2, X, Clock, Calendar, User,
  CheckCircle, XCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";

interface JadwalBimbingan {
  id: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  keterangan: string | null;
  status: "TERSEDIA" | "TERISI" | "DIBATALKAN";
  mahasiswaId: string | null;
  pendaftaranId: string | null;
  mahasiswa: { user: { name: string } } | null;
  pendaftaran: { id: string; judulTA: string } | null;
}

interface MahasiswaBimbingan {
  id: string;
  judulTA: string;
  mahasiswa: { id: string; nim: string; user: { name: string } };
}

const statusConf = {
  TERSEDIA: { label: "Tersedia", cls: "badge-diterima", Icon: CheckCircle },
  TERISI: { label: "Terisi", cls: "badge-menunggu", Icon: User },
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

export default function JadwalBimbinganPage() {
  const { data: session } = useSession();
  const [bulan, setBulan] = useState(getBulan(new Date()));
  const [list, setList] = useState<JadwalBimbingan[]>([]);
  const [loading, setLoading] = useState(true);
  const [mahasiswaList, setMahasiswaList] = useState<MahasiswaBimbingan[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tanggal: "", waktuMulai: "08:00", waktuSelesai: "09:00",
    keterangan: "", mahasiswaId: "", pendaftaranId: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchJadwal = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/jadwal/bimbingan?bulan=${bulan}`);
    setList(await r.json());
    setLoading(false);
  }, [bulan]);

  const fetchMahasiswa = useCallback(async () => {
    const r = await fetch("/api/pendaftaran");
    const data: MahasiswaBimbingan[] = (await r.json()).filter(
      (p: { status: string }) => p.status === "DITERIMA" || p.status === "DISETUJUI_ADMIN"
    );
    setMahasiswaList(data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchJadwal();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchJadwal]);

  useEffect(() => {
    if (session) {
      const t = setTimeout(() => {
        fetchMahasiswa();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [fetchMahasiswa, session]);

  const changeBulan = (delta: number) => {
    const [y, m] = bulan.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setBulan(getBulan(d));
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ tanggal: "", waktuMulai: "08:00", waktuSelesai: "09:00", keterangan: "", mahasiswaId: "", pendaftaranId: "" });
    setMsg(null);
    setShowForm(true);
  };

  const openEdit = (j: JadwalBimbingan) => {
    setEditId(j.id);
    setForm({
      tanggal: j.tanggal.split("T")[0],
      waktuMulai: j.waktuMulai,
      waktuSelesai: j.waktuSelesai,
      keterangan: j.keterangan || "",
      mahasiswaId: j.mahasiswaId || "",
      pendaftaranId: j.pendaftaranId || "",
    });
    setMsg(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.tanggal) return setMsg({ text: "Tanggal wajib diisi", type: "error" });
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        tanggal: form.tanggal,
        waktuMulai: form.waktuMulai,
        waktuSelesai: form.waktuSelesai,
        keterangan: form.keterangan || undefined,
        mahasiswaId: form.mahasiswaId || undefined,
        pendaftaranId: form.pendaftaranId || undefined,
      };
      const url = editId ? `/api/jadwal/bimbingan/${editId}` : "/api/jadwal/bimbingan";
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) return setMsg({ text: data.error, type: "error" });
      setMsg({ text: editId ? "Jadwal berhasil diperbarui" : "Sesi bimbingan berhasil ditambahkan", type: "success" });
      fetchJadwal();
      setTimeout(() => setShowForm(false), 1000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus sesi bimbingan ini?")) return;
    await fetch(`/api/jadwal/bimbingan/${id}`, { method: "DELETE" });
    fetchJadwal();
  };

  // Kelompokkan per tanggal
  const grouped = list.reduce<Record<string, JadwalBimbingan[]>>((acc, j) => {
    const tgl = j.tanggal.split("T")[0];
    if (!acc[tgl]) acc[tgl] = [];
    acc[tgl].push(j);
    return acc;
  }, {});

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Jadwal Bimbingan</div>
          <div className="topbar-subtitle">Atur sesi bimbingan mahasiswa Anda</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={15} /> Tambah Sesi
        </button>
      </div>

      <div className="page-content">
        {/* Navigasi bulan */}
        <div className="card mb-6" style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => changeBulan(-1)}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
              <Calendar size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              {formatBulan(bulan)}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => changeBulan(1)}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Ringkasan */}
        <div className="grid-3 mb-6">
          {[
            { label: "Total Sesi", val: list.length, color: "var(--primary)", bg: "var(--primary-bg)" },
            { label: "Tersedia", val: list.filter(j => j.status === "TERSEDIA").length, color: "var(--success)", bg: "var(--success-bg)" },
            { label: "Terisi", val: list.filter(j => j.status === "TERISI").length, color: "var(--warning)", bg: "var(--warning-bg)" },
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
              <h3 className="empty-state-title">Belum Ada Sesi Bimbingan</h3>
              <p className="empty-state-desc">Tambahkan sesi bimbingan untuk bulan {formatBulan(bulan)}</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                <Plus size={16} /> Tambah Sesi Pertama
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([tgl, sesi]) => (
              <div key={tgl} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={16} color="var(--primary)" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{formatTanggal(tgl)}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{sesi.length} sesi</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sesi.map(j => {
                    const conf = statusConf[j.status];
                    const SIcon = conf.Icon;
                    return (
                      <div key={j.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: "var(--bg)", borderRadius: 10,
                        padding: "12px 14px", border: "1px solid var(--border)",
                      }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--primary-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Clock size={14} color="var(--primary)" />
                          <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600 }}>{j.waktuMulai}</span>
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                              {j.waktuMulai} – {j.waktuSelesai}
                            </span>
                            <span className={`badge ${conf.cls}`}><SIcon size={11} /> {conf.label}</span>
                          </div>
                          {j.mahasiswa && (
                            <p style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                              <User size={12} /> {j.mahasiswa.user.name}
                            </p>
                          )}
                          {j.keterangan && (
                            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{j.keterangan}</p>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(j)} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(j.id)} title="Hapus">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {editId ? "Edit Sesi Bimbingan" : "Tambah Sesi Bimbingan"}
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
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Waktu Mulai <span className="required">*</span></label>
                <input type="time" className="form-input" value={form.waktuMulai}
                  onChange={e => setForm(f => ({ ...f, waktuMulai: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Waktu Selesai <span className="required">*</span></label>
                <input type="time" className="form-input" value={form.waktuSelesai}
                  onChange={e => setForm(f => ({ ...f, waktuSelesai: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assign ke Mahasiswa <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(Opsional)</span></label>
              <select className="form-select" value={form.mahasiswaId}
                onChange={e => {
                  const pendId = mahasiswaList.find(m => m.mahasiswa.id === e.target.value)?.id || "";
                  setForm(f => ({ ...f, mahasiswaId: e.target.value, pendaftaranId: pendId }));
                }}>
                <option value="">— Tidak Diassign —</option>
                {mahasiswaList.map(m => (
                  <option key={m.mahasiswa.id} value={m.mahasiswa.id}>
                    {m.mahasiswa.user.name} – {m.judulTA.slice(0, 40)}...
                  </option>
                ))}
              </select>
              <p className="form-hint">Hanya mahasiswa dengan status Diterima yang ditampilkan</p>
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(Opsional)</span></label>
              <input type="text" className="form-input" placeholder="Lokasi, topik, dll..." value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={15} />}
                {saving ? "Menyimpan..." : editId ? "Perbarui" : "Simpan Sesi"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
