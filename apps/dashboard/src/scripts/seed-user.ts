import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const username = "Gotha_mm";
  const password = "zombie1090max";

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    console.log("Default user already exists.");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  console.log("Default user created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
