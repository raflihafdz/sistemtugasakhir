import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClipboardList, Clock, CheckCircle, XCircle, FileText } from "lucide-react";

const statusMap: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  MENUNGGU: { label: "Menunggu", cls: "badge-menunggu", Icon: Clock },
  DITERIMA: { label: "Diterima", cls: "badge-diterima", Icon: CheckCircle },
  DITOLAK: { label: "Ditolak", cls: "badge-ditolak", Icon: XCircle },
  DISETUJUI_ADMIN: { label: "Disetujui Admin", cls: "badge-disetujui_admin", Icon: ClipboardList },
};

export default async function AdminPendaftaranPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const pendaftaran = await prisma.pendaftaranTugasAkhir.findMany({
    include: {
      mahasiswa: { include: { user: { select: { name: true, email: true } } } },
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

  const statCards = [
    { label: "Total", value: counts.total, Icon: ClipboardList, bg: "var(--primary-bg)", color: "var(--primary)" },
    { label: "Menunggu", value: counts.menunggu, Icon: Clock, bg: "var(--warning-bg)", color: "var(--warning)" },
    { label: "Diterima", value: counts.diterima, Icon: CheckCircle, bg: "var(--success-bg)", color: "var(--success)" },
    { label: "Ditolak", value: counts.ditolak, Icon: XCircle, bg: "var(--danger-bg)", color: "var(--danger)" },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Semua Pendaftaran TA</div>
          <div className="topbar-subtitle">Kelola seluruh pendaftaran tugas akhir mahasiswa</div>
        </div>
      </div>

      <div className="page-content">
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
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {pendaftaran.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Belum ada data</td></tr>
                ) : (
                  pendaftaran.map((p) => {
                    const st = statusMap[p.status] || statusMap.MENUNGGU;
                    const StIcon = st.Icon;
                    return (
                      <tr key={p.id}>
                        <td>
                          <p style={{ fontWeight: 600 }}>{p.mahasiswa.user.name}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.mahasiswa.user.email}</p>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 13 }}>{p.mahasiswa.nim}</td>
                        <td><p className="truncate">{p.judulTA}</p></td>
                        <td>{p.dosenPembimbing1.user.name}</td>
                        <td style={{ color: "var(--text-muted)" }}>{p.dosenPembimbing2?.user.name || "—"}</td>
                        <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--text-muted)" }}>
                          {new Date(p.createdAt).toLocaleDateString("id-ID")}
                        </td>
                        <td>
                          <span className={`badge ${st.cls}`}><StIcon size={11} /> {st.label}</span>
                        </td>
                        <td>
                          <a href={p.fileProposal} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                            <FileText size={13} />
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
