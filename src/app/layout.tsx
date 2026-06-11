import type { Metadata } from "next";
import "./globals.css";
import { fontVars } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Quire — The AI Writing Studio",
  description:
    "From a spark to a finished book. Quire is a premium, AI-native studio for writing real books — you hold the pen, Quire holds everything else.",
  applicationName: "Quire",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
