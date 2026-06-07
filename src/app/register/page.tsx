"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "MAHASISWA",
    nim: "",
    nidn: "",
    prodi: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }

    if (form.role === "MAHASISWA" && !form.nim) {
      setError("NIM wajib diisi untuk mahasiswa.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          nim: form.nim || undefined,
          nidn: form.nidn || undefined,
          prodi: form.prodi || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrasi gagal.");
      } else {
        setSuccess("Registrasi berhasil! Silakan login.");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🎓</div>
          <div className="auth-logo-text">
            <h1>Sistem Tugas Akhir</h1>
            <p>Universitas</p>
          </div>
        </div>

        <h2 className="auth-title">Buat Akun Baru</h2>
        <p className="auth-subtitle">Daftarkan diri Anda ke sistem</p>

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
          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Daftar Sebagai <span className="required">*</span>
            </label>
            <select
              id="role"
              name="role"
              className="form-select"
              value={form.role}
              onChange={handleChange}
            >
              <option value="MAHASISWA">Mahasiswa</option>
              <option value="DOSEN">Dosen</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Nama Lengkap <span className="required">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="Nama lengkap"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="nama@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {form.role === "MAHASISWA" && (
            <div className="form-group">
              <label className="form-label" htmlFor="nim">
                NIM <span className="required">*</span>
              </label>
              <input
                id="nim"
                name="nim"
                type="text"
                className="form-input"
                placeholder="Nomor Induk Mahasiswa"
                value={form.nim}
                onChange={handleChange}
              />
            </div>
          )}

          {form.role === "DOSEN" && (
            <div className="form-group">
              <label className="form-label" htmlFor="nidn">
                NIDN
              </label>
              <input
                id="nidn"
                name="nidn"
                type="text"
                className="form-input"
                placeholder="Nomor Induk Dosen Nasional"
                value={form.nidn}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="prodi">
              Program Studi
            </label>
            <input
              id="prodi"
              name="prodi"
              type="text"
              className="form-input"
              placeholder="Contoh: Teknik Informatika"
              value={form.prodi}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Password <span className="required">*</span>
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Minimal 8 karakter"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Konfirmasi Password <span className="required">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Ulangi password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>

        <hr className="divider" />

        <p style={{ textAlign: "center", fontSize: "14px", color: "var(--text-muted)" }}>
          Sudah punya akun?{" "}
          <Link href="/login" className="text-link">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
