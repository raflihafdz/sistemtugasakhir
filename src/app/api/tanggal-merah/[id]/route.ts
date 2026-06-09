import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  tanggal: z.string().optional(),
  judul: z.string().min(1, "Judul agenda wajib diisi").optional(),
  keterangan: z.string().optional().nullable(),
});

interface TanggalMerahWithGroup {
  id: string;
  tanggal: Date;
  judul: string;
  keterangan: string | null;
  groupId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// PATCH: update tanggal merah (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.tanggalMerah.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Data tanggal merah tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.parse(body);

    if ((existing as unknown as TanggalMerahWithGroup).groupId) {
      // Jika merupakan bagian dari libur rentang
      if (parsed.tanggal && parsed.tanggal.split("T")[0] !== new Date(existing.tanggal).toISOString().split("T")[0]) {
        return NextResponse.json(
          { error: "Untuk merubah tanggal pada libur rentang (libur panjang), silakan hapus agenda tersebut lalu buat kembali dengan rentang yang diinginkan." },
          { status: 400 }
        );
      }

      // Update judul & keterangan untuk seluruh rentang
      const updated = await prisma.tanggalMerah.updateMany({
        where: { groupId: (existing as unknown as TanggalMerahWithGroup).groupId } as unknown as Record<string, unknown>,
        data: {
          ...(parsed.judul && { judul: parsed.judul }),
          ...(parsed.keterangan !== undefined && { keterangan: parsed.keterangan }),
        },
      });

      return NextResponse.json({ message: "Rentang libur berhasil diperbarui", count: updated.count });
    } else {
      // Normal single date update
      const updated = await prisma.tanggalMerah.update({
        where: { id },
        data: {
          ...(parsed.tanggal && { tanggal: new Date(parsed.tanggal) }),
          ...(parsed.judul && { judul: parsed.judul }),
          ...(parsed.keterangan !== undefined && { keterangan: parsed.keterangan }),
        },
      });
      return NextResponse.json(updated);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// DELETE: hapus tanggal merah (Admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.tanggalMerah.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Data tanggal merah tidak ditemukan" }, { status: 404 });
    }

    if ((existing as unknown as TanggalMerahWithGroup).groupId) {
      // Hapus seluruh item yang tergabung dalam rentang yang sama
      await prisma.tanggalMerah.deleteMany({
        where: { groupId: (existing as unknown as TanggalMerahWithGroup).groupId } as unknown as Record<string, unknown>,
      });
      return NextResponse.json({ message: "Rentang libur berhasil dihapus" });
    } else {
      // Hapus single date
      await prisma.tanggalMerah.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Tanggal merah berhasil dihapus" });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
