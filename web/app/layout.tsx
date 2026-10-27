import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevSpace AI",
  description: "AI-native simulated engineering internship — Applied AI Engineering",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
