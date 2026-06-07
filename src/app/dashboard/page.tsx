import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;

  // Fetch stats based on role
  let stats = { total: 0, menunggu: 0, diterima: 0, ditolak: 0 };

  if (role === "MAHASISWA" && session.user.mahasiswaId) {
    const [total, menunggu, diterima, ditolak] = await Promise.all([
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: session.user.mahasiswaId } }),
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: session.user.mahasiswaId, status: "MENUNGGU" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: session.user.mahasiswaId, status: "DITERIMA" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { mahasiswaId: session.user.mahasiswaId, status: "DITOLAK" } }),
    ]);
    stats = { total, menunggu, diterima, ditolak };
  } else if (role === "DOSEN" && session.user.dosenId) {
    const dosenId = session.user.dosenId;
    const orFilter = [
      { dosenPembimbing1Id: dosenId },
      { dosenPembimbing2Id: dosenId },
    ];
    const [total, menunggu, diterima, ditolak] = await Promise.all([
      prisma.pendaftaranTugasAkhir.count({ where: { OR: orFilter } }),
      prisma.pendaftaranTugasAkhir.count({ where: { OR: orFilter, status: "MENUNGGU" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { OR: orFilter, status: "DITERIMA" } }),
      prisma.pendaftaranTugasAkhir.count({ where: { OR: orFilter, status: "DITOLAK" } }),
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
    MAHASISWA: "Mahasiswa",
    DOSEN: "Dosen",
    ADMIN: "Administrator",
  };

  const statCards = [
    { label: "Total Pendaftaran", value: stats.total, icon: "📋", color: "rgba(99,102,241,0.2)" },
    { label: "Menunggu", value: stats.menunggu, icon: "⏳", color: "rgba(245,158,11,0.2)" },
    { label: "Diterima", value: stats.diterima, icon: "✅", color: "rgba(16,185,129,0.2)" },
    { label: "Ditolak", value: stats.ditolak, icon: "❌", color: "rgba(239,68,68,0.2)" },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">
            Selamat datang, {session.user.name} — {roleLabel[role]}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div
          className="card mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(14,165,233,0.1))",
            borderColor: "rgba(99,102,241,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              🎓
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                Sistem Manajemen Tugas Akhir
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                {role === "MAHASISWA"
                  ? "Kelola pendaftaran dan pantau status tugas akhir Anda"
                  : role === "DOSEN"
                  ? "Tinjau dan kelola permintaan bimbingan dari mahasiswa"
                  : "Kelola seluruh pendaftaran tugas akhir dan data akademik"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid-4 mb-6">
          {statCards.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.color }}>
                {s.icon}
              </div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {role === "MAHASISWA" && (
          <div className="card">
            <h3 className="card-title">Panduan Pendaftaran Tugas Akhir</h3>
            <p className="card-subtitle">Langkah-langkah untuk mendaftar tugas akhir</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { step: "1", title: "Isi Formulir Pendaftaran", desc: "Masukkan judul TA dan pilih dosen pembimbing" },
                { step: "2", title: "Upload Proposal", desc: "Unggah file proposal dalam format PDF (max 10MB)" },
                { step: "3", title: "Tunggu Konfirmasi", desc: "Dosen pembimbing akan meninjau pendaftaran Anda" },
                { step: "4", title: "Pantau Status", desc: "Cek status pendaftaran secara berkala di menu Status" },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "12px",
                    borderRadius: 8,
                    background: "var(--bg-hover)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
