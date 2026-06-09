"use client";

import { useState, useEffect, useCallback } from "react";

interface Pendaftaran {
  id: string;
  judulTA: string;
  fileProposal: string;
  fileProposalName: string;
  status: string;
  catatan: string | null;
  createdAt: string;
  mahasiswa: {
    nim: string;
    prodi: string | null;
    user: { name: string; email: string };
  };
  dosenPembimbing1: { id: string; user: { name: string } };
  dosenPembimbing2: { id: string; user: { name: string } } | null;
}

const statusMap: Record<string, { label: string; cls: string; icon: string }> = {
  MENUNGGU: { label: "Menunggu", cls: "badge-menunggu", icon: "⏳" },
  DITERIMA: { label: "Diterima", cls: "badge-diterima", icon: "✅" },
  DITOLAK: { label: "Ditolak", cls: "badge-ditolak", icon: "❌" },
  DISETUJUI_ADMIN: { label: "Disetujui Admin", cls: "badge-disetujui_admin", icon: "🎉" },
};

export default function BimbinganPage() {
  const [list, setList] = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pendaftaran | null>(null);
  const [modalStatus, setModalStatus] = useState<"DITERIMA" | "DITOLAK" | "">("");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pendaftaran");
      const data = await r.json();
      setList(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const openModal = (p: Pendaftaran) => {
    setSelected(p);
    setModalStatus("");
    setCatatan("");
    setMsg(null);
  };

  const handleAction = async () => {
    if (!selected || !modalStatus) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/pendaftaran/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: modalStatus, catatan: catatan || undefined }),
      });
      const data = await r.json();
      if (r.ok) {
        setMsg({ text: `Berhasil ${modalStatus === "DITERIMA" ? "menerima" : "menolak"} mahasiswa.`, type: "success" });
        setSelected(null);
        fetchData();
      } else {
        setMsg({ text: data.error || "Gagal memperbarui status", type: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const menunggu = list.filter((p) => p.status === "MENUNGGU");
  const riwayat = list.filter((p) => p.status !== "MENUNGGU");

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Permintaan Bimbingan</div>
          <div className="topbar-subtitle">Terima atau tolak permintaan bimbingan dari mahasiswa</div>
        </div>
        <span className="badge badge-menunggu" style={{ fontSize: 14, padding: "6px 16px" }}>
          {menunggu.length} Menunggu
        </span>
      </div>

      <div className="page-content">
        {msg && (
          <div className={`alert alert-${msg.type} mb-4`}>
            <span>{msg.type === "success" ? "✅" : "⚠️"}</span>
            <span>{msg.text}</span>
          </div>
        )}

        {/* ── Menunggu Konfirmasi ── */}
        <div className="card mb-6">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 className="card-title">Menunggu Konfirmasi</h3>
              <p className="card-subtitle">
                {menunggu.length === 0
                  ? "Tidak ada permintaan baru"
                  : `${menunggu.length} mahasiswa meminta Anda sebagai pembimbing`}
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }} />
              <span style={{ marginLeft: 8 }}>Memuat...</span>
            </div>
          ) : menunggu.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon">✉️</div>
              <p className="empty-state-title">Tidak ada permintaan baru</p>
              <p className="empty-state-desc">Mahasiswa yang memilih Anda sebagai pembimbing akan muncul di sini</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {menunggu.map((p) => (
                <PendaftaranCard key={p.id} p={p} onAction={openModal} />
              ))}
            </div>
          )}
        </div>

        {/* ── Riwayat ── */}
        {riwayat.length > 0 && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Riwayat Keputusan</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {riwayat.map((p) => (
                <PendaftaranCard key={p.id} p={p} onAction={openModal} showAction={p.status === "DITOLAK"} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Konfirmasi ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Konfirmasi Permintaan Bimbingan</h3>

            {/* Info mahasiswa */}
            <div style={{ background: "var(--bg-hover)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700, color: "white", flexShrink: 0,
                  }}
                >
                  {selected.mahasiswa.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                    {selected.mahasiswa.user.name}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    NIM: {selected.mahasiswa.nim}
                    {selected.mahasiswa.prodi && ` · ${selected.mahasiswa.prodi}`}
                  </p>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <p style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                  Judul Tugas Akhir
                </p>
                <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{selected.judulTA}</p>
              </div>
              <a
                href={selected.fileProposal}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12 }}
              >
                📄 Unduh Proposal PDF
              </a>
            </div>

            {/* Pilihan keputusan */}
            <div className="form-group">
              <label className="form-label">Keputusan Anda <span className="required">*</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalStatus("DITERIMA")}
                  style={{
                    padding: "14px",
                    borderRadius: 10,
                    border: `2px solid ${modalStatus === "DITERIMA" ? "var(--success)" : "var(--border)"}`,
                    background: modalStatus === "DITERIMA" ? "rgba(16,185,129,0.1)" : "var(--bg-input)",
                    color: modalStatus === "DITERIMA" ? "var(--success)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 15,
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 24 }}>✅</span>
                  Terima
                </button>
                <button
                  type="button"
                  onClick={() => setModalStatus("DITOLAK")}
                  style={{
                    padding: "14px",
                    borderRadius: 10,
                    border: `2px solid ${modalStatus === "DITOLAK" ? "var(--danger)" : "var(--border)"}`,
                    background: modalStatus === "DITOLAK" ? "rgba(239,68,68,0.1)" : "var(--bg-input)",
                    color: modalStatus === "DITOLAK" ? "var(--danger)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 15,
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 24 }}>❌</span>
                  Tolak
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Catatan untuk Mahasiswa
                {modalStatus === "DITOLAK" && <span className="required"> *</span>}
                {modalStatus === "DITERIMA" && <span style={{ color: "var(--text-dim)", fontWeight: 400 }}> (Opsional)</span>}
              </label>
              <textarea
                className="form-textarea"
                placeholder={
                  modalStatus === "DITOLAK"
                    ? "Berikan alasan penolakan..."
                    : "Pesan selamat datang atau informasi kepada mahasiswa..."
                }
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
              />
            </div>

            {msg && (
              <div className={`alert alert-${msg.type}`} style={{ marginBottom: 0 }}>
                <span>{msg.type === "success" ? "✅" : "⚠️"}</span>
                <span>{msg.text}</span>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)} disabled={submitting}>
                Batal
              </button>
              <button
                className={`btn ${modalStatus === "DITERIMA" ? "btn-success" : "btn-danger"}`}
                onClick={handleAction}
                disabled={!modalStatus || (modalStatus === "DITOLAK" && !catatan.trim()) || submitting}
              >
                {submitting ? <span className="spinner" /> : null}
                {submitting ? "Menyimpan..." : modalStatus === "DITERIMA" ? "✅ Terima Mahasiswa" : "❌ Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PendaftaranCard({
  p,
  onAction,
  showAction = true,
}: {
  p: Pendaftaran;
  onAction: (p: Pendaftaran) => void;
  showAction?: boolean;
}) {
  const st = statusMap[p.status] || statusMap.MENUNGGU;
  return (
    <div
      style={{
        background: "var(--bg-hover)",
        borderRadius: 10,
        padding: "16px",
        border: "1px solid var(--border)",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span className={`badge ${st.cls}`}>{st.icon} {st.label}</span>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {new Date(p.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
          </span>
        </div>
        <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>
          {p.judulTA}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          👨‍🎓 <strong>{p.mahasiswa.user.name}</strong> · NIM: {p.mahasiswa.nim}
          {p.mahasiswa.prodi && ` · ${p.mahasiswa.prodi}`}
        </p>
        {p.catatan && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
            💬 &quot;{p.catatan}&quot;
          </p>
        )}
      </div>
      {showAction && p.status === "MENUNGGU" && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            className="btn btn-success btn-sm"
            onClick={() => { onAction(p); }}
          >
            ✅ Terima
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { onAction(p); }}
          >
            ❌ Tolak
          </button>
        </div>
      )}
      {showAction && p.status === "DITOLAK" && (
        <button className="btn btn-secondary btn-sm" onClick={() => onAction(p)}>
          Tinjau Ulang
        </button>
      )}
    </div>
  );
}
