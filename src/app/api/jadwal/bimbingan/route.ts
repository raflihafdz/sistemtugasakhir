import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  waktuMulai: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu HH:MM"),
  waktuSelesai: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu HH:MM"),
  keterangan: z.string().optional(),
  mahasiswaId: z.string().optional(),
  pendaftaranId: z.string().optional(),
});

// GET: ambil semua jadwal bimbingan milik dosen login
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.dosenId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get("bulan"); // "YYYY-MM"

  let tanggalFilter = {};
  if (bulan) {
    const [y, m] = bulan.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0); // last day
    tanggalFilter = { tanggal: { gte: start, lte: end } };
  }

  const jadwal = await prisma.jadwalBimbingan.findMany({
    where: { dosenId: session.user.dosenId, ...tanggalFilter },
    include: {
      mahasiswa: { include: { user: { select: { name: true } } } },
      pendaftaran: { select: { id: true, judulTA: true } },
    },
    orderBy: [{ tanggal: "asc" }, { waktuMulai: "asc" }],
  });

  return NextResponse.json(jadwal);
}

// POST: buat sesi bimbingan baru
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.dosenId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (data.waktuMulai >= data.waktuSelesai) {
      return NextResponse.json(
        { error: "Waktu mulai harus lebih awal dari waktu selesai" },
        { status: 400 }
      );
    }

    const dosenId = session.user.dosenId;
    const tanggal = new Date(data.tanggal);
    const mulai = data.waktuMulai;
    const selesai = data.waktuSelesai;

    // 1. Cek konflik dengan sesi BIMBINGAN lain di hari yang sama
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
        { error: `Bentrok dengan sesi bimbingan ${bentrokBimbingan.waktuMulai}–${bentrokBimbingan.waktuSelesai} di hari yang sama.` },
        { status: 400 }
      );

    // 2. Cek konflik dengan sesi SIDANG di hari yang sama
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
        { error: `Bentrok dengan jadwal sidang ${bentrokSidang.waktuMulaiAvailable}–${bentrokSidang.waktuSelesaiAvailable} di hari yang sama.` },
        { status: 400 }
      );

    const jadwal = await prisma.jadwalBimbingan.create({
      data: {
        dosenId,
        tanggal,
        waktuMulai: mulai,
        waktuSelesai: selesai,
        keterangan: data.keterangan,
        mahasiswaId: data.mahasiswaId || null,
        pendaftaranId: data.pendaftaranId || null,
        status: "TERSEDIA",
      },
      include: {
        mahasiswa: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json(jadwal, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
