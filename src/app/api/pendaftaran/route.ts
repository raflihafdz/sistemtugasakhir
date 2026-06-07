import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { z } from "zod";

const pendaftaranSchema = z.object({
  judulTA: z.string().min(10, "Judul minimal 10 karakter"),
  dosenPembimbing1Id: z.string().min(1, "Dosen Pembimbing 1 wajib dipilih"),
  dosenPembimbing2Id: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mahasiswaId = searchParams.get("mahasiswaId");

    let where = {};
    if (session.user.role === "MAHASISWA" && session.user.mahasiswaId) {
      where = { mahasiswaId: session.user.mahasiswaId };
    } else if (session.user.role === "DOSEN" && session.user.dosenId) {
      const dosenId = session.user.dosenId;
      where = {
        OR: [
          { dosenPembimbing1Id: dosenId },
          { dosenPembimbing2Id: dosenId },
          { dosenPenguji1Id: dosenId },
          { dosenPenguji2Id: dosenId },
        ],
      };
    } else if (session.user.role === "ADMIN" && mahasiswaId) {
      where = { mahasiswaId };
    }

    const pendaftaran = await prisma.pendaftaranTugasAkhir.findMany({
      where,
      include: {
        mahasiswa: {
          include: {
            user: {
              select: { name: true, email: true },
            },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pendaftaran);
  } catch (error) {
    console.error("Get pendaftaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "MAHASISWA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.mahasiswaId) {
      return NextResponse.json(
        { error: "Profil mahasiswa tidak ditemukan" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const judulTA = formData.get("judulTA") as string;
    const dosenPembimbing1Id = formData.get("dosenPembimbing1Id") as string;
    const dosenPembimbing2Id = formData.get("dosenPembimbing2Id") as string | null;
    const file = formData.get("fileProposal") as File | null;

    // Validate fields
    const validated = pendaftaranSchema.parse({
      judulTA,
      dosenPembimbing1Id,
      dosenPembimbing2Id: dosenPembimbing2Id || undefined,
    });

    if (!file) {
      return NextResponse.json(
        { error: "File proposal wajib diupload" },
        { status: 400 }
      );
    }

    // Check file type (PDF only)
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File proposal harus berformat PDF" },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB" },
        { status: 400 }
      );
    }

    // Save file
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "proposals");
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const fileName = `${session.user.mahasiswaId}_${timestamp}_${file.name.replace(/\s/g, "_")}`;
    const filePath = path.join(uploadsDir, fileName);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    const fileUrl = `/uploads/proposals/${fileName}`;

    // Create pendaftaran
    const pendaftaran = await prisma.pendaftaranTugasAkhir.create({
      data: {
        mahasiswaId: session.user.mahasiswaId,
        judulTA: validated.judulTA,
        fileProposal: fileUrl,
        fileProposalName: file.name,
        dosenPembimbing1Id: validated.dosenPembimbing1Id,
        dosenPembimbing2Id: validated.dosenPembimbing2Id ?? null,
        status: "MENUNGGU",
      },
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
      },
    });

    return NextResponse.json(
      { message: "Pendaftaran berhasil dikirim", data: pendaftaran },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Post pendaftaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
