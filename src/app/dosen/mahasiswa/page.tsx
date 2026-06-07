import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DosenMahasiswaPage() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN") redirect("/dashboard");
  if (!session.user.dosenId) redirect("/dashboard");

  const dosenId = session.user.dosenId;

  const bimbingan = await prisma.pendaftaranTugasAkhir.findMany({
    where: {
      OR: [
        { dosenPembimbing1Id: dosenId },
        { dosenPembimbing2Id: dosenId },
      ],
    },
    include: {
      mahasiswa: {
        include: { user: { select: { name: true, email: true } } },
      },
      dosenPembimbing1: { include: { user: { select: { name: true } } } },
      dosenPembimbing2: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusMap: Record<string, string> = {
    MENUNGGU: "badge-menunggu",
    DITERIMA: "badge-diterima",
    DITOLAK: "badge-ditolak",
    REVISI: "badge-revisi",
    DISETUJUI_ADMIN: "badge-disetujui_admin",
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Daftar Mahasiswa</div>
          <div className="topbar-subtitle">Mahasiswa bimbingan Anda</div>
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          {bimbingan.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3 className="empty-state-title">Belum Ada Mahasiswa</h3>
              <p className="empty-state-desc">Belum ada mahasiswa yang memilih Anda sebagai pembimbing</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mahasiswa</th>
                    <th>NIM</th>
                    <th>Judul TA</th>
                    <th>Peran</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bimbingan.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 600 }}>{p.mahasiswa.user.name}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.mahasiswa.user.email}</p>
                        </div>
                      </td>
                      <td>{p.mahasiswa.nim}</td>
                      <td>
                        <p className="truncate" style={{ maxWidth: 200 }}>{p.judulTA}</p>
                      </td>
                      <td>
                        <span className={`badge ${p.dosenPembimbing1Id === dosenId ? "badge-dosen" : "badge-mahasiswa"}`}>
                          {p.dosenPembimbing1Id === dosenId ? "Pembimbing 1" : "Pembimbing 2"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusMap[p.status]}`}>
                          {p.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
