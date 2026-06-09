"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface DosenItem {
  id: string;
  nidn: string | null;
  prodi: string | null;
  maxSlot: number;
  terisi: number;
  sisaSlot: number;
  user: { name: string; email: string };
}

export default function DaftarTAPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dosenList, setDosenList] = useState<DosenItem[]>([]);
  const [form, setForm] = useState({
    judulTA: "",
    dosenPembimbing1Id: "",
    dosenPembimbing2Id: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDosen, setFetchingDosen] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Fetch dosen dengan slot info (realtime setiap 30 detik)
  const fetchDosen = async () => {
    try {
      const r = await fetch("/api/dosen");
      const data = await r.json();
      setDosenList(data);
    } catch {
      setError("Gagal memuat data dosen");
    } finally {
      setFetchingDosen(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchDosen();
    }, 0);
    const interval = setInterval(fetchDosen, 30000); // refresh tiap 30 detik
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setError("");
    } else {
      setError("Hanya file PDF yang diperbolehkan");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Hanya file PDF yang diperbolehkan");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10MB");
      return;
    }
    setFile(selected);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.judulTA.trim()) return setError("Judul TA wajib diisi");
    if (!form.dosenPembimbing1Id) return setError("Dosen Pembimbing 1 wajib dipilih");
    if (!file) return setError("File proposal wajib diupload");
    if (form.dosenPembimbing2Id && form.dosenPembimbing2Id === form.dosenPembimbing1Id)
      return setError("Dosen Pembimbing 1 dan 2 tidak boleh sama");

    // Cek slot di sisi klien sebelum submit
    const d1 = dosenList.find((d) => d.id === form.dosenPembimbing1Id);
    if (d1 && d1.sisaSlot === 0) {
      return setError(`Dosen ${d1.user.name} sudah penuh. Silakan pilih dosen lain.`);
    }
    if (form.dosenPembimbing2Id) {
      const d2 = dosenList.find((d) => d.id === form.dosenPembimbing2Id);
      if (d2 && d2.sisaSlot === 0) {
        return setError(`Dosen ${d2.user.name} sudah penuh. Silakan pilih dosen lain.`);
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("judulTA", form.judulTA);
      fd.append("dosenPembimbing1Id", form.dosenPembimbing1Id);
      if (form.dosenPembimbing2Id) fd.append("dosenPembimbing2Id", form.dosenPembimbing2Id);
      fd.append("fileProposal", file);

      const res = await fetch("/api/pendaftaran", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Pendaftaran gagal");
      } else {
        setSuccess("Pendaftaran berhasil dikirim! Menunggu konfirmasi dosen pembimbing.");
        setForm({ judulTA: "", dosenPembimbing1Id: "", dosenPembimbing2Id: "" });
        setFile(null);
        setTimeout(() => router.push("/mahasiswa/status"), 2000);
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Helper: render opsi dosen dengan info slot
  const renderDosenOption = (d: DosenItem) => {
    const penuh = d.sisaSlot === 0;
    return (
      <option key={d.id} value={d.id} disabled={penuh}>
        {penuh ? "🔴" : d.sisaSlot <= 2 ? "🟡" : "🟢"} {d.user.name}
        {d.nidn ? ` (${d.nidn})` : ""}
        {d.prodi ? ` — ${d.prodi}` : ""}
        {" "}· Sisa: {d.sisaSlot}/{d.maxSlot} slot
        {penuh ? " [PENUH]" : ""}
      </option>
    );
  };

  const selectedDosen1 = dosenList.find((d) => d.id === form.dosenPembimbing1Id);
  const selectedDosen2 = dosenList.find((d) => d.id === form.dosenPembimbing2Id);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Daftar Tugas Akhir</div>
          <div className="topbar-subtitle">Isi formulir pendaftaran bimbingan tugas akhir</div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchDosen}
          title="Refresh data slot dosen"
        >
          🔄 Refresh Slot
        </button>
      </div>

      <div className="page-content">
        {/* Legend slot */}
        <div
          className="card mb-6"
          style={{
            background: "rgba(99,102,241,0.07)",
            borderColor: "rgba(99,102,241,0.2)",
            padding: "14px 20px",
          }}
        >
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Keterangan Slot:</span>
            {[
              { dot: "🟢", label: "Tersedia (≥3 slot)" },
              { dot: "🟡", label: "Hampir penuh (1-2 slot)" },
              { dot: "🔴", label: "Penuh (tidak bisa dipilih)" },
            ].map((l) => (
              <span key={l.label} style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {l.dot} {l.label}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)" }}>
              {fetchingDosen ? "Memuat..." : "Diperbarui otomatis setiap 30 detik"}
            </span>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 720 }}>
          <h3 className="card-title">Formulir Pendaftaran Bimbingan TA</h3>
          <p className="card-subtitle">
            Kolom bertanda <span style={{ color: "var(--danger)" }}>*</span> wajib diisi.
          </p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span>✅</span><span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Judul TA */}
            <div className="form-group">
              <label className="form-label" htmlFor="judulTA">
                Judul Tugas Akhir <span className="required">*</span>
              </label>
              <textarea
                id="judulTA"
                name="judulTA"
                className="form-textarea"
                placeholder="Masukkan judul tugas akhir secara lengkap..."
                value={form.judulTA}
                onChange={handleChange}
                rows={3}
                required
              />
              <p className="form-hint">Minimal 10 karakter. Gunakan kalimat yang jelas.</p>
            </div>

            {/* File Proposal */}
            <div className="form-group">
              <label className="form-label">
                File Proposal <span className="required">*</span>
              </label>
              {file ? (
                <div className="file-selected">
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600 }}>{file.name}</p>
                    <p style={{ fontSize: 12, opacity: 0.8 }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 18 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  className={`file-upload-area ${dragOver ? "drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} accept="application/pdf" onChange={handleFileChange} />
                  <div className="file-upload-icon">📁</div>
                  <p className="file-upload-text">
                    <strong>Klik untuk upload</strong> atau drag & drop
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                    Format PDF · Maksimal 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Dosen Pembimbing 1 */}
            <div className="form-group">
              <label className="form-label" htmlFor="dosenPembimbing1Id">
                Dosen Pembimbing 1 <span className="required">*</span>
              </label>
              <select
                id="dosenPembimbing1Id"
                name="dosenPembimbing1Id"
                className="form-select"
                value={form.dosenPembimbing1Id}
                onChange={handleChange}
                required
              >
                <option value="">— Pilih Dosen Pembimbing 1 —</option>
                {dosenList.map(renderDosenOption)}
              </select>
              {/* Info slot dosen 1 terpilih */}
              {selectedDosen1 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: selectedDosen1.sisaSlot === 0
                      ? "rgba(239,68,68,0.1)"
                      : selectedDosen1.sisaSlot <= 2
                      ? "rgba(245,158,11,0.1)"
                      : "rgba(16,185,129,0.1)",
                    border: `1px solid ${selectedDosen1.sisaSlot === 0
                      ? "rgba(239,68,68,0.3)"
                      : selectedDosen1.sisaSlot <= 2
                      ? "rgba(245,158,11,0.3)"
                      : "rgba(16,185,129,0.3)"}`,
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>
                    {selectedDosen1.user.name}
                    {selectedDosen1.prodi && ` · ${selectedDosen1.prodi}`}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {selectedDosen1.sisaSlot === 0 ? "🔴 Penuh" : `🟢 ${selectedDosen1.sisaSlot} slot tersisa`}
                  </span>
                </div>
              )}
            </div>

            {/* Dosen Pembimbing 2 */}
            <div className="form-group">
              <label className="form-label" htmlFor="dosenPembimbing2Id">
                Dosen Pembimbing 2{" "}
                <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(Opsional)</span>
              </label>
              <select
                id="dosenPembimbing2Id"
                name="dosenPembimbing2Id"
                className="form-select"
                value={form.dosenPembimbing2Id}
                onChange={handleChange}
              >
                <option value="">— Tidak Ada —</option>
                {dosenList
                  .filter((d) => d.id !== form.dosenPembimbing1Id)
                  .map(renderDosenOption)}
              </select>
              {selectedDosen2 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: selectedDosen2.sisaSlot === 0
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(16,185,129,0.1)",
                    border: `1px solid ${selectedDosen2.sisaSlot === 0 ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>{selectedDosen2.user.name}</span>
                  <span style={{ fontWeight: 700 }}>
                    {selectedDosen2.sisaSlot === 0 ? "🔴 Penuh" : `🟢 ${selectedDosen2.sisaSlot} slot tersisa`}
                  </span>
                </div>
              )}
            </div>

            <hr className="divider" />

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard")} disabled={loading}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? "Mengirim..." : "🚀 Kirim Pendaftaran"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
