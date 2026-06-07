import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClipboardList, Clock, CheckCircle, XCircle, FilePlus, ChevronRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;

  let stats = { total: 0, menunggu: 0, diterima: 0, ditolak: 0 };

  if (role === "MAHASISWA" && session.user.mahasiswaId) {
    const mid = session.user.mahasiswaId;
    const [total, menunggu, diterima, ditolak] = await Promise.all([
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: mid } }),
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: mid, status: "MENUNGGU" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: mid, status: "DITERIMA" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: mid, status: "DITOLAK" } }),
    ]);
    stats = { total, menunggu, diterima, ditolak };
  } else if (role === "DOSEN" && session.user.dosenId) {
    const did = session.user.dosenId;
    const or = [{ dosenPembimbing1Id: did }, { dosenPembimbing2Id: did }];
    const [total, menunggu, diterima, ditolak] = await Promise.all([
      prisma.pendaftaranTugasAkhir.count({ where: { OR: or } }),
      prisma.pendaftaranTugasAkhir.count({ where: { OR: or, status: "MENUNGGU" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { OR: or, status: "DITERIMA" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { OR: or, status: "DITOLAK" } }),
    ]);
    stats = { total, menunggu, diterima, ditolak };
  } else if (role === "ADMIN") {
    const [total, menunggu, diterima, ditolak] = await Promise.all([
      prisma.pendaftaranTugasAkhir.count(),
      prisma.pendaftaranTugasAkhir.count({ where: { status: "MENUNGGU" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { status: "DITERIMA" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { status: "DITOLAK" } }),
    ]);
    stats = { total, menunggu, diterima, ditolak };
  }

  const roleLabel: Record<string, string> = {
    MAHASISWA: "Mahasiswa", DOSEN: "Dosen", ADMIN: "Administrator",
  };

  const statCards = [
    { label: "Total Pendaftaran", value: stats.total, Icon: ClipboardList, bg: "var(--primary-bg)", color: "var(--primary)" },
    { label: "Menunggu", value: stats.menunggu, Icon: Clock, bg: "var(--warning-bg)", color: "var(--warning)" },
    { label: "Diterima", value: stats.diterima, Icon: CheckCircle, bg: "var(--success-bg)", color: "var(--success)" },
    { label: "Ditolak", value: stats.ditolak, Icon: XCircle, bg: "var(--danger-bg)", color: "var(--danger)" },
  ];

  const steps = [
    { n: "1", title: "Isi Formulir Pendaftaran", desc: "Masukkan judul TA dan pilih dosen pembimbing" },
    { n: "2", title: "Upload Proposal", desc: "Unggah file proposal dalam format PDF (max 10MB)" },
    { n: "3", title: "Tunggu Konfirmasi Dosen", desc: "Dosen pembimbing akan meninjau dan menyetujui permintaan" },
    { n: "4", title: "Pantau Status", desc: "Cek status pendaftaran secara berkala di menu Status" },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">Selamat datang, {session.user.name} — {roleLabel[role]}</div>
        </div>
        {role === "MAHASISWA" && (
          <Link href="/mahasiswa/daftar-ta" className="btn btn-primary btn-sm">
            <FilePlus size={15} /> Daftar TA
          </Link>
        )}
      </div>

      <div className="page-content">
        {/* Hero banner */}
        <div className="card mb-6" style={{ background: "linear-gradient(135deg, var(--primary-bg), #EFF6FF)", borderColor: "rgba(124,58,237,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
              <ClipboardList size={26} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Sistem Manajemen Tugas Akhir</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>
                {role === "MAHASISWA" ? "Kelola pendaftaran dan pantau status bimbingan tugas akhir Anda"
                  : role === "DOSEN" ? "Tinjau dan kelola permintaan bimbingan dari mahasiswa"
                  : "Kelola seluruh pendaftaran tugas akhir dan data akademik"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4 mb-6">
          {statCards.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.Icon size={22} color={s.color} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Panduan mahasiswa */}
        {role === "MAHASISWA" && (
          <div className="card">
            <h3 className="card-title">Panduan Pendaftaran Bimbingan</h3>
            <p className="card-subtitle">Langkah-langkah untuk mendaftar tugas akhir</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {steps.map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }}>
                    {s.n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{s.title}</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.desc}</p>
                  </div>
                  <ChevronRight size={16} color="var(--text-dim)" style={{ marginTop: 3 }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Link href="/mahasiswa/daftar-ta" className="btn btn-primary">
                <FilePlus size={16} /> Mulai Daftar Sekarang
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
