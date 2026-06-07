import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["MAHASISWA", "DOSEN", "ADMIN"]),
  nim: z.string().optional(),
  nidn: z.string().optional(),
  prodi: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check existing user
    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: validated.role,
        ...(validated.role === "MAHASISWA" && validated.nim
          ? {
              mahasiswa: {
                create: {
                  nim: validated.nim,
                  prodi: validated.prodi ?? null,
                },
              },
            }
          : {}),
        ...(validated.role === "DOSEN"
          ? {
              dosen: {
                create: {
                  nidn: validated.nidn ?? null,
                  prodi: validated.prodi ?? null,
                },
              },
            }
          : {}),
      },
      include: {
        mahasiswa: true,
        dosen: true,
      },
    });

    return NextResponse.json(
      {
        message: "Registrasi berhasil",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
