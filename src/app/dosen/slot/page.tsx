"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface SlotInfo {
  maxSlot: number;
  terisi: number;
  sisaSlot: number;
}

export default function DosenSlotPage() {
  const { data: session } = useSession();
  const [info, setInfo] = useState<SlotInfo | null>(null);
  const [newMax, setNewMax] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!session?.user?.dosenId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/dosen/${session.user.dosenId}`);
      const data = await r.json();
      setInfo(data);
      setNewMax(data.maxSlot);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.dosenId]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchInfo();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchInfo]);

  const handleSave = async () => {
    if (!session?.user?.dosenId) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/dosen/${session.user.dosenId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSlot: newMax }),
      });
      const data = await r.json();
      if (r.ok) {
        setMsg({ text: "Kapasitas berhasil diperbarui!", type: "success" });
        setInfo({ maxSlot: data.maxSlot, terisi: data.terisi, sisaSlot: data.sisaSlot });
      } else {
        setMsg({ text: data.error || "Gagal memperbarui kapasitas", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const pct = info ? Math.round((info.terisi / (info.maxSlot || 1)) * 100) : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Pengaturan Kapasitas</div>
          <div className="topbar-subtitle">Atur jumlah mahasiswa bimbingan yang dapat Anda terima</div>
        </div>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: 560 }}>
          {/* ── Kapasitas saat ini ── */}
          <div className="card mb-6">
            <h3 className="card-title" style={{ marginBottom: 20 }}>Status Slot Bimbingan</h3>

            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <span className="spinner" style={{ borderTopColor: "var(--primary)" }} />
              </div>
            ) : info ? (
              <>
                {/* Angka-angka */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Total Kapasitas", value: info.maxSlot, color: "rgba(99,102,241,0.2)", icon: "📦" },
                    { label: "Sudah Terisi", value: info.terisi, color: "rgba(245,158,11,0.2)", icon: "👨‍🎓" },
                    { label: "Sisa Slot", value: info.sisaSlot, color: info.sisaSlot === 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)", icon: info.sisaSlot === 0 ? "🚫" : "✅" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: s.color,
                        borderRadius: 10,
                        padding: "16px 12px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                    <span>Pengisian Slot</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: 10, background: "var(--border)", borderRadius: 5, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: pct >= 100
                          ? "var(--danger)"
                          : pct >= 75
                          ? "var(--warning)"
                          : "linear-gradient(90deg, var(--primary), var(--success))",
                        borderRadius: 5,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  {info.sisaSlot === 0 && (
                    <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>
                      ⚠️ Slot Anda sudah penuh. Mahasiswa baru tidak dapat mendaftar ke Anda.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* ── Ubah kapasitas ── */}
          <div className="card">
            <h3 className="card-title">Ubah Kapasitas Slot</h3>
            <p className="card-subtitle">
              Tentukan berapa mahasiswa yang dapat Anda bimbing. Nilai tidak bisa dikurangi di bawah jumlah mahasiswa yang sudah diterima.
            </p>

            {msg && (
              <div className={`alert alert-${msg.type}`}>
                <span>{msg.type === "success" ? "✅" : "⚠️"}</span>
                <span>{msg.text}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="maxSlot">
                Kapasitas Maksimal <span className="required">*</span>
              </label>

              {/* Slider + number input */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <input
                  type="range"
                  id="maxSlot-range"
                  min={info?.terisi ?? 0}
                  max={50}
                  value={newMax}
                  onChange={(e) => setNewMax(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--primary)", cursor: "pointer" }}
                />
                <input
                  id="maxSlot"
                  type="number"
                  className="form-input"
                  min={info?.terisi ?? 0}
                  max={50}
                  value={newMax}
                  onChange={(e) => setNewMax(Number(e.target.value))}
                  style={{ width: 80, textAlign: "center", flexShrink: 0 }}
                />
              </div>
              <p className="form-hint">
                Minimum: {info?.terisi ?? 0} (jumlah mahasiswa aktif) · Maksimum: 50
              </p>
            </div>

            {/* Preview perubahan */}
            {info && newMax !== info.maxSlot && (
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <span>ℹ️</span>
                <span>
                  Slot akan berubah dari <strong>{info.maxSlot}</strong> → <strong>{newMax}</strong>.
                  Sisa slot baru: <strong>{Math.max(0, newMax - info.terisi)}</strong>
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setNewMax(info?.maxSlot ?? 5); setMsg(null); }}
                disabled={saving}
              >
                Reset
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || newMax === info?.maxSlot}
              >
                {saving ? <span className="spinner" /> : null}
                {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
