import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const createSchema = z.object({
  tanggal: z.string().optional(),
  tanggalMulai: z.string().optional(),
  tanggalSelesai: z.string().optional(),
  judul: z.string().min(1, "Judul agenda wajib diisi"),
  keterangan: z.string().optional().nullable(),
});

// GET: ambil semua tanggal merah / agenda akademik (bisa diakses Dosen dan Admin)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get("bulan"); // format: "YYYY-MM"

  let tanggalFilter = {};
  if (bulan) {
    const [y, m] = bulan.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0); // hari terakhir dari bulan tersebut
    tanggalFilter = {
      tanggal: {
        gte: start,
        lte: end,
      },
    };
  }

  try {
    const data = await prisma.tanggalMerah.findMany({
      where: {
        ...tanggalFilter,
      },
      orderBy: {
        tanggal: "asc",
      },
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// POST: tambah tanggal merah baru (bisa single date atau range) (hanya Admin)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const datesToInsert: Date[] = [];
    let isRange = false;

    if (parsed.tanggalMulai && parsed.tanggalSelesai) {
      const start = new Date(parsed.tanggalMulai);
      const end = new Date(parsed.tanggalSelesai);
      if (start > end) {
        return NextResponse.json(
          { error: "Tanggal mulai harus lebih awal dari tanggal selesai." },
          { status: 400 }
        );
      }
      isRange = true;

      // Kumpulkan semua tanggal dalam rentang tersebut
      const current = new Date(start);
      while (current <= end) {
        datesToInsert.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (parsed.tanggal) {
      datesToInsert.push(new Date(parsed.tanggal));
    } else {
      return NextResponse.json(
        { error: "Pilih tanggal atau tentukan rentang tanggal libur." },
        { status: 400 }
      );
    }

    if (datesToInsert.length === 0) {
      return NextResponse.json({ error: "Daftar tanggal kosong." }, { status: 400 });
    }

    // Cek jika ada tanggal yang sudah terdaftar
    const existing = await prisma.tanggalMerah.findFirst({
      where: {
        tanggal: {
          in: datesToInsert,
        },
      },
    });

    if (existing) {
      const existingDateStr = new Date(existing.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      return NextResponse.json(
        { error: `Tanggal ${existingDateStr} sudah terdaftar sebagai hari libur (${existing.judul}).` },
        { status: 400 }
      );
    }

    const groupId = isRange ? crypto.randomUUID() : null;

    // Masukkan semua tanggal secara transaction
    const createdItems = await prisma.$transaction(
      datesToInsert.map((d) =>
        prisma.tanggalMerah.create({
          data: {
            tanggal: d,
            judul: parsed.judul,
            keterangan: parsed.keterangan || null,
            groupId,
          },
        })
      )
    );

    return NextResponse.json(createdItems, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
