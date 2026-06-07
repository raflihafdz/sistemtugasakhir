import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminMahasiswaPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const mahasiswa = await prisma.mahasiswa.findMany({
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      pendaftaranTugasAkhir: { select: { id: true, status: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Data Mahasiswa</div>
          <div className="topbar-subtitle">{mahasiswa.length} mahasiswa terdaftar</div>
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NIM</th>
                  <th>Program Studi</th>
                  <th>Email</th>
                  <th>Pendaftaran TA</th>
                  <th>Bergabung</th>
                </tr>
              </thead>
              <tbody>
                {mahasiswa.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      Belum ada data mahasiswa
                    </td>
                  </tr>
                ) : (
                  mahasiswa.map((m) => (
                    <tr key={m.id}>
                      <td><p style={{ fontWeight: 600 }}>{m.user.name}</p></td>
                      <td>{m.nim}</td>
                      <td>{m.prodi || "—"}</td>
                      <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{m.user.email}</td>
                      <td>
                        <span className="badge badge-dosen">{m.pendaftaranTugasAkhir.length} TA</span>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {new Date(m.user.createdAt).toLocaleDateString("id-ID")}
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
