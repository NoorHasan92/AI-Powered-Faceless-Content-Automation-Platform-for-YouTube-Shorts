// File Location: src/actions/auth.actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Username and password are required" };
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return { success: false, error: "Invalid credentials" };
  }

  await createSession(user.id);
  
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function updatePasswordAction(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return { success: false, error: "All fields are required" };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long" };
  }

  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatch) {
    return { success: false, error: "Incorrect current password" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return { success: true };
}
