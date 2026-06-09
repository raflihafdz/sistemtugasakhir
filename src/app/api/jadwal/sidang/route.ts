import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  tanggal: z.string().min(1),
  waktuMulaiAvailable: z.string().regex(/^\d{2}:\d{2}$/),
  waktuSelesaiAvailable: z.string().regex(/^\d{2}:\d{2}$/),
  keterangan: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.dosenId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get("bulan");

  let tanggalFilter = {};
  if (bulan) {
    const [y, m] = bulan.split("-").map(Number);
    tanggalFilter = {
      tanggal: { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) },
    };
  }

  const jadwal = await prisma.jadwalSidang.findMany({
    where: { dosenId: session.user.dosenId, ...tanggalFilter },
    include: {
      pendaftaran: {
        select: {
          judulTA: true,
          mahasiswa: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ tanggal: "asc" }, { waktuMulaiAvailable: "asc" }],
  });

  return NextResponse.json(jadwal);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.dosenId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (data.waktuMulaiAvailable >= data.waktuSelesaiAvailable)
      return NextResponse.json({ error: "Waktu mulai harus lebih awal dari waktu selesai" }, { status: 400 });

    const dosenId = session.user.dosenId;
    const tanggal = new Date(data.tanggal);
    const mulai = data.waktuMulaiAvailable;
    const selesai = data.waktuSelesaiAvailable;

    // Cek Tanggal Merah / Libur Akademik
    const tglMerah = await prisma.tanggalMerah.findFirst({
      where: { tanggal }
    });
    if (tglMerah) {
      return NextResponse.json(
        { error: `Tidak dapat membuat jadwal pada hari libur akademik / tanggal merah: ${tglMerah.judul}` },
        { status: 400 }
      );
    }

    // 1. Cek overlap dengan sesi SIDANG lain di hari yang sama
    const bentrokSidang = await prisma.jadwalSidang.findFirst({
      where: {
        dosenId,
        tanggal,
        status: { not: "DIBATALKAN" },
        AND: [
          { waktuMulaiAvailable: { lt: selesai } },
          { waktuSelesaiAvailable: { gt: mulai } },
        ],
      },
    });
    if (bentrokSidang)
      return NextResponse.json(
        { error: `Bertabrakan dengan sesi sidang ${bentrokSidang.waktuMulaiAvailable}–${bentrokSidang.waktuSelesaiAvailable} di hari yang sama.` },
        { status: 400 }
      );

    // 2. Cek konflik dengan sesi BIMBINGAN di hari yang sama
    const bentrokBimbingan = await prisma.jadwalBimbingan.findFirst({
      where: {
        dosenId,
        tanggal,
        status: { not: "DIBATALKAN" },
        AND: [
          { waktuMulai: { lt: selesai } },
          { waktuSelesai: { gt: mulai } },
        ],
      },
    });
    if (bentrokBimbingan)
      return NextResponse.json(
        { error: `Bertabrakan dengan sesi bimbingan ${bentrokBimbingan.waktuMulai}–${bentrokBimbingan.waktuSelesai} di hari yang sama.` },
        { status: 400 }
      );

    const jadwal = await prisma.jadwalSidang.create({
      data: {
        dosenId,
        tanggal,
        waktuMulaiAvailable: mulai,
        waktuSelesaiAvailable: selesai,
        keterangan: data.keterangan,
        status: "TERSEDIA",
      },
    });

    return NextResponse.json(jadwal, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
