import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, CheckCircle, XCircle, Award, FilePlus, FileText, MessageSquare } from "lucide-react";

const statusMap: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  MENUNGGU: { label: "Menunggu Konfirmasi Dosen", cls: "badge-menunggu", Icon: Clock },
  DITERIMA: { label: "Diterima Dosen", cls: "badge-diterima", Icon: CheckCircle },
  DITOLAK: { label: "Ditolak", cls: "badge-ditolak", Icon: XCircle },
  DISETUJUI_ADMIN: { label: "Disetujui Admin", cls: "badge-disetujui_admin", Icon: Award },
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
          <div className="topbar-subtitle">Pantau status bimbingan tugas akhir Anda</div>
        </div>
        <Link href="/mahasiswa/daftar-ta" className="btn btn-primary btn-sm">
          <FilePlus size={15} /> Daftar Baru
        </Link>
      </div>

      <div className="page-content">
        {pendaftaran.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><FileText size={48} /></div>
              <h3 className="empty-state-title">Belum Ada Pendaftaran</h3>
              <p className="empty-state-desc">Anda belum mendaftarkan tugas akhir.</p>
              <Link href="/mahasiswa/daftar-ta" className="btn btn-primary" style={{ marginTop: 20 }}>
                <FilePlus size={16} /> Daftar Tugas Akhir
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pendaftaran.map((p) => {
              const st = statusMap[p.status] || statusMap.MENUNGGU;
              const StIcon = st.Icon;
              return (
                <div key={p.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 5 }}>{p.judulTA}</h3>
                      <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        Didaftarkan: {new Date(p.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
                      </p>
                    </div>
                    <span className={`badge ${st.cls}`}>
                      <StIcon size={12} /> {st.label}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "Pembimbing 1", name: p.dosenPembimbing1.user.name },
                      { label: "Pembimbing 2", name: p.dosenPembimbing2?.user.name || "—" },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--border)" }}>
                        <p style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{item.label}</p>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{item.name}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <a href={p.fileProposal} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                      <FileText size={14} /> Lihat Proposal
                    </a>
                    {p.catatan && (
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 7, background: "var(--warning-bg)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--warning)" }}>
                        <MessageSquare size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{p.catatan}</span>
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
