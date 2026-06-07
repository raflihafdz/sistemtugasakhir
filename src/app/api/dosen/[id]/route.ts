import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSlotSchema = z.object({
  maxSlot: z.number().int().min(0).max(50),
});

// GET /api/dosen/[id] — detail satu dosen
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dosen = await prisma.dosen.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        bimbingan1: { where: { status: "DITERIMA" }, select: { id: true } },
        bimbingan2: { where: { status: "DITERIMA" }, select: { id: true } },
      },
    });

    if (!dosen) {
      return NextResponse.json({ error: "Dosen tidak ditemukan" }, { status: 404 });
    }

    const terisi = dosen.bimbingan1.length + dosen.bimbingan2.length;
    return NextResponse.json({
      id: dosen.id,
      nidn: dosen.nidn,
      prodi: dosen.prodi,
      maxSlot: dosen.maxSlot,
      terisi,
      sisaSlot: Math.max(0, dosen.maxSlot - terisi),
      user: dosen.user,
    });
  } catch (error) {
    console.error("Get dosen by id error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// PATCH /api/dosen/[id] — dosen update maxSlot miliknya sendiri
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOSEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Dosen hanya bisa update profil miliknya sendiri
    if (session.user.dosenId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { maxSlot } = updateSlotSchema.parse(body);

    // Cek apakah maxSlot baru tidak lebih kecil dari jumlah mahasiswa yang sudah diterima
    const dosen = await prisma.dosen.findUnique({
      where: { id },
      include: {
        bimbingan1: { where: { status: "DITERIMA" }, select: { id: true } },
        bimbingan2: { where: { status: "DITERIMA" }, select: { id: true } },
      },
    });

    if (!dosen) {
      return NextResponse.json({ error: "Dosen tidak ditemukan" }, { status: 404 });
    }

    const terisi = dosen.bimbingan1.length + dosen.bimbingan2.length;
    if (maxSlot < terisi) {
      return NextResponse.json(
        {
          error: `Tidak dapat mengurangi slot di bawah jumlah mahasiswa yang sudah diterima (${terisi} mahasiswa).`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.dosen.update({
      where: { id },
      data: { maxSlot },
    });

    return NextResponse.json({
      message: "Kapasitas berhasil diperbarui",
      maxSlot: updated.maxSlot,
      terisi,
      sisaSlot: updated.maxSlot - terisi,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update dosen slot error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
