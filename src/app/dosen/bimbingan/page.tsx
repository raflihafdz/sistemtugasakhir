"use client";

import { useState, useEffect } from "react";

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
  REVISI: { label: "Perlu Revisi", cls: "badge-revisi", icon: "📝" },
  DISETUJUI_ADMIN: { label: "Disetujui Admin", cls: "badge-disetujui_admin", icon: "🎉" },
};

export default function BimbinganPage() {
  const [list, setList] = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pendaftaran | null>(null);
  const [modalStatus, setModalStatus] = useState("");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pendaftaran");
      const data = await r.json();
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (p: Pendaftaran) => {
    setSelected(p);
    setModalStatus("");
    setCatatan("");
    setMsg("");
  };

  const handleAction = async () => {
    if (!selected || !modalStatus) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/pendaftaran/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: modalStatus, catatan }),
      });
      const data = await r.json();
      if (r.ok) {
        setMsg("Status berhasil diperbarui");
        setSelected(null);
        fetchData();
      } else {
        setMsg(data.error || "Gagal memperbarui status");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const menunggu = list.filter((p) => p.status === "MENUNGGU");
  const diproses = list.filter((p) => p.status !== "MENUNGGU");

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Permintaan Bimbingan</div>
          <div className="topbar-subtitle">Tinjau dan kelola permintaan dari mahasiswa</div>
        </div>
      </div>

      <div className="page-content">
        {msg && (
          <div className="alert alert-success mb-4">
            <span>✅</span><span>{msg}</span>
          </div>
        )}

        {/* Menunggu Konfirmasi */}
        <div className="card mb-6">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 className="card-title">Menunggu Konfirmasi</h3>
              <p className="card-subtitle">{menunggu.length} permintaan membutuhkan tindakan Anda</p>
            </div>
            <span className="badge badge-menunggu" style={{ fontSize: 14, padding: "6px 14px" }}>
              {menunggu.length} Baru
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              <span className="spinner" style={{ borderTopColor: "var(--primary)" }} /> Memuat...
            </div>
          ) : menunggu.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">✉️</div>
              <p className="empty-state-title">Tidak ada permintaan baru</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {menunggu.map((p) => (
                <PendaftaranCard key={p.id} p={p} onAction={openModal} />
              ))}
            </div>
          )}
        </div>

        {/* Riwayat */}
        {diproses.length > 0 && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Riwayat</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {diproses.map((p) => (
                <PendaftaranCard key={p.id} p={p} onAction={openModal} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Tindakan Bimbingan</h3>

            <div style={{ background: "var(--bg-hover)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 8 }}>
                {selected.judulTA}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Mahasiswa: <strong>{selected.mahasiswa.user.name}</strong> — NIM: {selected.mahasiswa.nim}
              </p>
              <a
                href={selected.fileProposal}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12 }}
              >
                📄 Unduh Proposal
              </a>
            </div>

            <div className="form-group">
              <label className="form-label">Keputusan <span className="required">*</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { value: "DITERIMA", label: "✅ Terima", color: "var(--success)" },
                  { value: "DITOLAK", label: "❌ Tolak", color: "var(--danger)" },
                  { value: "REVISI", label: "📝 Revisi", color: "var(--info)" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setModalStatus(opt.value)}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: `2px solid ${modalStatus === opt.value ? opt.color : "var(--border)"}`,
                      background: modalStatus === opt.value ? `${opt.color}20` : "var(--bg-input)",
                      color: modalStatus === opt.value ? opt.color : "var(--text-muted)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      transition: "all 0.2s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Catatan (Opsional)</label>
              <textarea
                className="form-textarea"
                placeholder="Tambahkan catatan untuk mahasiswa..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAction}
                disabled={!modalStatus || submitting}
              >
                {submitting ? <span className="spinner" /> : null}
                {submitting ? "Menyimpan..." : "Simpan Keputusan"}
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
}: {
  p: Pendaftaran;
  onAction: (p: Pendaftaran) => void;
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
          👨‍🎓 {p.mahasiswa.user.name} — NIM: {p.mahasiswa.nim}
          {p.mahasiswa.prodi && ` — ${p.mahasiswa.prodi}`}
        </p>
        {p.catatan && (
          <p style={{ fontSize: 12, color: "var(--warning)", marginTop: 6 }}>
            💬 {p.catatan}
          </p>
        )}
      </div>
      <button className="btn btn-secondary btn-sm" onClick={() => onAction(p)}>
        Tinjau
      </button>
    </div>
  );
}
