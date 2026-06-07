"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Dosen {
  id: string;
  nidn: string | null;
  prodi: string | null;
  user: { name: string; email: string };
}

export default function DaftarTAPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dosenList, setDosenList] = useState<Dosen[]>([]);
  const [form, setForm] = useState({
    judulTA: "",
    dosenPembimbing1Id: "",
    dosenPembimbing2Id: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/dosen")
      .then((r) => r.json())
      .then(setDosenList)
      .catch(() => setError("Gagal memuat data dosen"));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
    } else {
      setError("Hanya file PDF yang diperbolehkan");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.judulTA.trim()) return setError("Judul TA wajib diisi");
    if (!form.dosenPembimbing1Id) return setError("Dosen Pembimbing 1 wajib dipilih");
    if (!file) return setError("File proposal wajib diupload");

    if (form.dosenPembimbing2Id && form.dosenPembimbing2Id === form.dosenPembimbing1Id) {
      return setError("Dosen Pembimbing 1 dan 2 tidak boleh sama");
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
        setSuccess("Pendaftaran berhasil dikirim! Menunggu konfirmasi dosen.");
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

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Daftar Tugas Akhir</div>
          <div className="topbar-subtitle">Isi formulir pendaftaran tugas akhir</div>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <h3 className="card-title">Formulir Pendaftaran Tugas Akhir</h3>
          <p className="card-subtitle">
            Lengkapi semua informasi yang diperlukan. Kolom bertanda{" "}
            <span style={{ color: "var(--danger)" }}>*</span> wajib diisi.
          </p>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span>✅</span>
              <span>{success}</span>
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
              <p className="form-hint">Minimal 10 karakter. Gunakan kalimat yang jelas dan deskriptif.</p>
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
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--danger)",
                      fontSize: 18,
                    }}
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
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                  <div className="file-upload-icon">📁</div>
                  <p className="file-upload-text">
                    <strong>Klik untuk upload</strong> atau drag & drop file di sini
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                    Format PDF, maksimal 10MB
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
                {dosenList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name}
                    {d.nidn ? ` (NIDN: ${d.nidn})` : ""}
                    {d.prodi ? ` — ${d.prodi}` : ""}
                  </option>
                ))}
              </select>
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
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.name}
                      {d.nidn ? ` (NIDN: ${d.nidn})` : ""}
                      {d.prodi ? ` — ${d.prodi}` : ""}
                    </option>
                  ))}
              </select>
            </div>

            <hr className="divider" />

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push("/dashboard")}
                disabled={loading}
              >
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
