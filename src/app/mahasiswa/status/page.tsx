import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusMap: Record<string, { label: string; cls: string; icon: string }> = {
  MENUNGGU: { label: "Menunggu Konfirmasi", cls: "badge-menunggu", icon: "⏳" },
  DITERIMA: { label: "Diterima", cls: "badge-diterima", icon: "✅" },
  DITOLAK: { label: "Ditolak", cls: "badge-ditolak", icon: "❌" },
  REVISI: { label: "Perlu Revisi", cls: "badge-revisi", icon: "📝" },
  DISETUJUI_ADMIN: { label: "Disetujui Admin", cls: "badge-disetujui_admin", icon: "🎉" },
};

export default async function StatusPage() {
  const session = await auth();
  if (!session || session.user.role !== "MAHASISWA") redirect("/login");
  if (!session.user.mahasiswaId) redirect("/dashboard");

  const pendaftaran = await prisma.pendaftaranTugasAkhir.findMany({
    where: { mahasiswaId: session.user.mahasiswaId },
    include: {
      dosenPembimbing1: { include: { user: { select: { name: true } } } },
      dosenPembimbing2: { include: { user: { select: { name: true } } } },
      persetujuan: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Status Pendaftaran</div>
          <div className="topbar-subtitle">Pantau status tugas akhir Anda</div>
        </div>
        <Link href="/mahasiswa/daftar-ta" className="btn btn-primary btn-sm">
          + Daftar Baru
        </Link>
      </div>

      <div className="page-content">
        {pendaftaran.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 className="empty-state-title">Belum Ada Pendaftaran</h3>
              <p className="empty-state-desc">
                Anda belum mendaftarkan tugas akhir. Klik tombol di bawah untuk mulai.
              </p>
              <Link href="/mahasiswa/daftar-ta" className="btn btn-primary" style={{ marginTop: 20 }}>
                Daftar Tugas Akhir
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pendaftaran.map((p) => {
              const st = statusMap[p.status] || statusMap.MENUNGGU;
              return (
                <div key={p.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                        {p.judulTA}
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        Didaftarkan: {new Date(p.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
                      </p>
                    </div>
                    <span className={`badge ${st.cls}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "12px" }}>
                      <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>
                        Pembimbing 1
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        {p.dosenPembimbing1.user.name}
                      </p>
                    </div>
                    <div style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "12px" }}>
                      <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>
                        Pembimbing 2
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        {p.dosenPembimbing2?.user.name || "—"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <a
                      href={p.fileProposal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      📄 Lihat Proposal
                    </a>
                    {p.catatan && (
                      <div style={{ flex: 1, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "var(--warning)" }}>
                        💬 Catatan: {p.catatan}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
