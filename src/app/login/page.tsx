"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEnd, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Email atau password salah. Silakan coba lagi.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><GalleryVerticalEnd size={22} /></div>
          <div className="auth-logo-text">
            <h1>Sistem Tugas Akhir</h1>
            <p>Portal Akademik Universitas</p>
          </div>
        </div>

        <h2 className="auth-title">Masuk ke Akun</h2>
        <p className="auth-subtitle">Masukkan kredensial Anda untuk melanjutkan</p>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email <span className="required">*</span></label>
            <div style={{ position: "relative" }}>
              <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input
                id="email" type="email" className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="nama@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password <span className="required">*</span></label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input
                id="password" type="password" className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="Masukkan password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <Loader2 size={16} className="spin-icon" /> : null}
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <hr className="divider" />
        <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
          Belum punya akun?{" "}
          <Link href="/register" className="text-link">Daftar sekarang</Link>
        </p>
      </div>

      <style>{`.spin-icon { animation: spin 0.6s linear infinite; }`}</style>
    </div>
  );
}
