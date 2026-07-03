// File Location: src/app/layout.tsx
// Base Root Layout wrapping all route groups.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShortForge AI",
  description: "Automated Short-Form Video Pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} text-slate-900 bg-slate-50`}>
        {children}
      </body>
    </html>
  );
}
