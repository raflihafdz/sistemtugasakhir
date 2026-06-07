import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";

export default async function AdminDosenPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const dosen = await prisma.dosen.findMany({
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      bimbingan1: { select: { id: true } },
      bimbingan2: { select: { id: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Data Dosen</div>
          <div className="topbar-subtitle">{dosen.length} dosen terdaftar</div>
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          {dosen.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={48} /></div>
              <h3 className="empty-state-title">Belum Ada Dosen</h3>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>NIDN</th>
                    <th>Program Studi</th>
                    <th>Email</th>
                    <th>Kapasitas</th>
                    <th>Bimbingan</th>
                    <th>Bergabung</th>
                  </tr>
                </thead>
                <tbody>
                  {dosen.map((d) => {
                    const terisi = d.bimbingan1.length + d.bimbingan2.length;
                    return (
                      <tr key={d.id}>
                        <td><p style={{ fontWeight: 600 }}>{d.user.name}</p></td>
                        <td style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-muted)" }}>{d.nidn || "—"}</td>
                        <td style={{ color: "var(--text-muted)" }}>{d.prodi || "—"}</td>
                        <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{d.user.email}</td>
                        <td>
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{terisi}/{d.maxSlot}</span>
                        </td>
                        <td><span className="badge badge-dosen">{terisi} Mahasiswa</span></td>
                        <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {new Date(d.user.createdAt).toLocaleDateString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
