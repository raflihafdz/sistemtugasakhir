import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  tanggal: z.string().optional(),
  waktuMulai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  waktuSelesai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  keterangan: z.string().optional().nullable(),
  status: z.enum(["TERSEDIA", "TERISI", "DIBATALKAN"]).optional(),
  mahasiswaId: z.string().optional().nullable(),
  pendaftaranId: z.string().optional().nullable(),
});

async function getOwned(id: string, dosenId: string) {
  return prisma.jadwalBimbingan.findFirst({ where: { id, dosenId } });
}

// PATCH: update sesi
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.dosenId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getOwned(id, session.user.dosenId);
  if (!existing) return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const mulai = data.waktuMulai ?? existing.waktuMulai;
    const selesai = data.waktuSelesai ?? existing.waktuSelesai;
    if (mulai >= selesai)
      return NextResponse.json({ error: "Waktu mulai harus lebih awal dari waktu selesai" }, { status: 400 });

    const updated = await prisma.jadwalBimbingan.update({
      where: { id },
      data: {
        ...(data.tanggal && { tanggal: new Date(data.tanggal) }),
        ...(data.waktuMulai && { waktuMulai: data.waktuMulai }),
        ...(data.waktuSelesai && { waktuSelesai: data.waktuSelesai }),
        ...(data.keterangan !== undefined && { keterangan: data.keterangan }),
        ...(data.status && { status: data.status }),
        ...(data.mahasiswaId !== undefined && { mahasiswaId: data.mahasiswaId }),
        ...(data.pendaftaranId !== undefined && { pendaftaranId: data.pendaftaranId }),
      },
      include: { mahasiswa: { include: { user: { select: { name: true } } } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.dosenId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getOwned(id, session.user.dosenId);
  if (!existing) return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });

  await prisma.jadwalBimbingan.delete({ where: { id } });
  return NextResponse.json({ message: "Jadwal berhasil dihapus" });
}
