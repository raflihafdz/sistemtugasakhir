import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create Admin
  const adminPass = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@universitasku.ac.id" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@universitasku.ac.id",
      password: adminPass,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin:", admin.email);

  // Create Dosen 1
  const dosenPass = await bcrypt.hash("dosen123456", 12);
  const dosen1 = await prisma.user.upsert({
    where: { email: "dr.budi@universitasku.ac.id" },
    update: {},
    create: {
      name: "Dr. Budi Santoso, M.Kom",
      email: "dr.budi@universitasku.ac.id",
      password: dosenPass,
      role: "DOSEN",
      dosen: {
        create: {
          nidn: "0012345678",
          prodi: "Teknik Informatika",
        },
      },
    },
  });
  console.log("✅ Dosen 1:", dosen1.email);

  // Create Dosen 2
  const dosen2 = await prisma.user.upsert({
    where: { email: "dr.siti@universitasku.ac.id" },
    update: {},
    create: {
      name: "Dr. Siti Rahayu, M.T",
      email: "dr.siti@universitasku.ac.id",
      password: dosenPass,
      role: "DOSEN",
      dosen: {
        create: {
          nidn: "0098765432",
          prodi: "Sistem Informasi",
        },
      },
    },
  });
  console.log("✅ Dosen 2:", dosen2.email);

  // Create Mahasiswa
  const mahasiswaPass = await bcrypt.hash("mahasiswa123456", 12);
  const mhs = await prisma.user.upsert({
    where: { email: "ahmad.fauzi@mahasiswa.ac.id" },
    update: {},
    create: {
      name: "Ahmad Fauzi",
      email: "ahmad.fauzi@mahasiswa.ac.id",
      password: mahasiswaPass,
      role: "MAHASISWA",
      mahasiswa: {
        create: {
          nim: "2021001234",
          prodi: "Teknik Informatika",
          angkatan: "2021",
        },
      },
    },
  });
  console.log("✅ Mahasiswa:", mhs.email);

  console.log("\n🎉 Seeding selesai!");
  console.log("\n📋 Akun Login:");
  console.log("  Admin    → admin@universitasku.ac.id / admin123456");
  console.log("  Dosen 1  → dr.budi@universitasku.ac.id / dosen123456");
  console.log("  Dosen 2  → dr.siti@universitasku.ac.id / dosen123456");
  console.log("  Mahasiswa → ahmad.fauzi@mahasiswa.ac.id / mahasiswa123456");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
