import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NIDN</th>
                  <th>Program Studi</th>
                  <th>Email</th>
                  <th>Bimbingan Aktif</th>
                  <th>Bergabung</th>
                </tr>
              </thead>
              <tbody>
                {dosen.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      Belum ada data dosen
                    </td>
                  </tr>
                ) : (
                  dosen.map((d) => (
                    <tr key={d.id}>
                      <td><p style={{ fontWeight: 600 }}>{d.user.name}</p></td>
                      <td>{d.nidn || "—"}</td>
                      <td>{d.prodi || "—"}</td>
                      <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{d.user.email}</td>
                      <td>
                        <span className="badge badge-dosen">
                          {d.bimbingan1.length + d.bimbingan2.length} Mahasiswa
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {new Date(d.user.createdAt).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
