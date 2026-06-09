import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dosen = await prisma.dosen.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        // hitung mahasiswa yang sudah DITERIMA sebagai pembimbing 1 atau 2
        bimbingan1: {
          where: { status: "DITERIMA" },
          select: { id: true },
        },
        bimbingan2: {
          where: { status: "DITERIMA" },
          select: { id: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const result = dosen.map((d) => {
      const terisi = d.bimbingan1.length + d.bimbingan2.length;
      const sisa = Math.max(0, d.maxSlot - terisi);
      return {
        id: d.id,
        nidn: d.nidn,
        prodi: d.prodi,
        maxSlot: d.maxSlot,
        terisi,
        sisaSlot: sisa,
        user: d.user,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get dosen error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
