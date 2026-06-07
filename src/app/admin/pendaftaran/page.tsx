import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusMap: Record<string, { label: string; cls: string }> = {
  MENUNGGU: { label: "Menunggu", cls: "badge-menunggu" },
  DITERIMA: { label: "Diterima", cls: "badge-diterima" },
  DITOLAK: { label: "Ditolak", cls: "badge-ditolak" },
  REVISI: { label: "Perlu Revisi", cls: "badge-revisi" },
  DISETUJUI_ADMIN: { label: "Disetujui Admin", cls: "badge-disetujui_admin" },
};

export default async function AdminPendaftaranPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const pendaftaran = await prisma.pendaftaranTugasAkhir.findMany({
    include: {
      mahasiswa: {
        include: { user: { select: { name: true, email: true } } },
      },
      dosenPembimbing1: { include: { user: { select: { name: true } } } },
      dosenPembimbing2: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    total: pendaftaran.length,
    menunggu: pendaftaran.filter((p) => p.status === "MENUNGGU").length,
    diterima: pendaftaran.filter((p) => p.status === "DITERIMA").length,
    ditolak: pendaftaran.filter((p) => p.status === "DITOLAK").length,
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Semua Pendaftaran TA</div>
          <div className="topbar-subtitle">Kelola seluruh pendaftaran tugas akhir mahasiswa</div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="grid-4 mb-6">
          {[
            { label: "Total", value: counts.total, color: "rgba(99,102,241,0.2)", icon: "📋" },
            { label: "Menunggu", value: counts.menunggu, color: "rgba(245,158,11,0.2)", icon: "⏳" },
            { label: "Diterima", value: counts.diterima, color: "rgba(16,185,129,0.2)", icon: "✅" },
            { label: "Ditolak", value: counts.ditolak, color: "rgba(239,68,68,0.2)", icon: "❌" },
          ].map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mahasiswa</th>
                  <th>NIM</th>
                  <th>Judul TA</th>
                  <th>Pembimbing 1</th>
                  <th>Pembimbing 2</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendaftaran.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      Belum ada data pendaftaran
                    </td>
                  </tr>
                ) : (
                  pendaftaran.map((p) => {
                    const st = statusMap[p.status] || statusMap.MENUNGGU;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div>
                            <p style={{ fontWeight: 600 }}>{p.mahasiswa.user.name}</p>
                            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.mahasiswa.user.email}</p>
                          </div>
                        </td>
                        <td>{p.mahasiswa.nim}</td>
                        <td>
                          <p className="truncate">{p.judulTA}</p>
                        </td>
                        <td>{p.dosenPembimbing1.user.name}</td>
                        <td>{p.dosenPembimbing2?.user.name || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {new Date(p.createdAt).toLocaleDateString("id-ID")}
                        </td>
                        <td>
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td>
                          <a
                            href={p.fileProposal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            📄
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
