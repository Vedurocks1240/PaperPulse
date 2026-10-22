import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./globals.css";
import type { Metadata } from "next";
import Uida from "@/components/Uida";
import Dock from "@/components/Dock";

export const metadata: Metadata = { title: "PaperPulse", description: "Share verified documents with a code" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <div id="app"><main>{children}</main></div>
        <Dock />
        <Uida />
      </body>
    </html>
  );
}
