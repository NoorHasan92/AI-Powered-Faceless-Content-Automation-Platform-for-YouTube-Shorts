// File Location: src/actions/auth.actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import ResetPasswordEmail from "@/components/emails/ResetPasswordEmail";
import PasswordChangedEmail from "@/components/emails/PasswordChangedEmail";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_build_key");

export async function loginAction(formData: FormData) {
  const identifier = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!identifier || !password) {
    return { success: false, error: "Username/Email and password are required" };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
      ],
    },
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
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "All fields are required" };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  if (newPassword.length < 4) {
    return { success: false, error: "New password must be at least 4 characters long" };
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

  if (user.email) {
    try {
      const React = await import('react');
      const { render } = await import('@react-email/components');
      const emailHtml = await render(React.createElement(PasswordChangedEmail, null));
      
      await resend.emails.send({
        from: 'Security <security@tars.homes>',
        to: user.email,
        subject: 'Security Alert: Password Changed',
        html: emailHtml,
      });
    } catch (error) {
      console.error("Failed to send alert email:", error);
    }
  }

  return { success: true };
}

export async function requestPasswordResetAction(email: string) {
  if (!email) {
    return { success: false, error: "Email is required" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Return success even if user not found to prevent email enumeration
    return { success: true };
  }

  // Generate 8 digit secure OTP
  const otp = crypto.randomInt(10000000, 99999999).toString();
  const hashedOtp = await bcrypt.hash(otp, 12);
  
  // Expiry time: 15 minutes from now
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetOtp: hashedOtp,
      resetOtpExpires: expiresAt,
    },
  });

  try {
    const React = await import('react');
    const { render } = await import('@react-email/components');
    const emailHtml = await render(React.createElement(ResetPasswordEmail, { otp }));
    
    await resend.emails.send({
      from: 'Security <security@tars.homes>',
      to: email,
      subject: 'ShortForge AI - Password Reset Request',
      html: emailHtml,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    // Even if email fails locally, we might want to let them know it failed or log it
    // return { success: false, error: "Failed to send reset email. Please try again." };
  }

  return { success: true };
}

export async function resetPasswordWithOtpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !otp || !newPassword || !confirmPassword) {
    return { success: false, error: "All fields are required" };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  if (newPassword.length < 4) {
    return { success: false, error: "New password must be at least 4 characters long" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.resetOtp || !user.resetOtpExpires) {
    return { success: false, error: "Invalid or expired reset code" };
  }

  if (user.resetOtpExpires < new Date()) {
    return { success: false, error: "Reset code has expired" };
  }

  const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
  
  if (!isOtpValid) {
    return { success: false, error: "Invalid reset code" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetOtp: null,
      resetOtpExpires: null,
    },
  });

  try {
    const React = await import('react');
    const { render } = await import('@react-email/components');
    const emailHtml = await render(React.createElement(PasswordChangedEmail, null));
    
    await resend.emails.send({
      from: 'Security <security@tars.homes>',
      to: email,
      subject: 'Security Alert: Password Changed',
      html: emailHtml,
    });
  } catch (error) {
    console.error("Failed to send alert email:", error);
  }

  return { success: true };
}
