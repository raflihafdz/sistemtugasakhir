import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["DITERIMA", "DITOLAK", "REVISI", "DISETUJUI_ADMIN"]),
  catatan: z.string().optional(),
  subRole: z.enum(["PEMBIMBING_1", "PEMBIMBING_2", "PENGUJI_1", "PENGUJI_2"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const pendaftaran = await prisma.pendaftaranTugasAkhir.findUnique({
      where: { id },
      include: {
        mahasiswa: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        dosenPembimbing1: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        dosenPembimbing2: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        dosenPenguji1: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        dosenPenguji2: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        persetujuan: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pendaftaran) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(pendaftaran);
  } catch (error) {
    console.error("Get pendaftaran by id error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "DOSEN" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Determine sub role
    let subRole = validated.subRole;
    if (session.user.role === "DOSEN" && !subRole) {
      const pendaftaran = await prisma.pendaftaranTugasAkhir.findUnique({
        where: { id },
      });

      if (!pendaftaran) {
        return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
      }

      const dosenId = session.user.dosenId;
      if (pendaftaran.dosenPembimbing1Id === dosenId) {
        subRole = "PEMBIMBING_1";
      } else if (pendaftaran.dosenPembimbing2Id === dosenId) {
        subRole = "PEMBIMBING_2";
      } else if (pendaftaran.dosenPenguji1Id === dosenId) {
        subRole = "PENGUJI_1";
      } else if (pendaftaran.dosenPenguji2Id === dosenId) {
        subRole = "PENGUJI_2";
      }
    }

    // Update status and create persetujuan record
    const updated = await prisma.$transaction(async (tx) => {
      const updatedPendaftaran = await tx.pendaftaranTugasAkhir.update({
        where: { id },
        data: {
          status: validated.status,
          catatan: validated.catatan ?? null,
        },
      });

      if (session.user.dosenId && subRole) {
        await tx.persetujuan.create({
          data: {
            pendaftaranId: id,
            dosenId: session.user.dosenId,
            subRole,
            status: validated.status,
            catatan: validated.catatan ?? null,
          },
        });
      }

      return updatedPendaftaran;
    });

    return NextResponse.json({
      message: "Status berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update pendaftaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
