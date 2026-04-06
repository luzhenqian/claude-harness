import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "claude-harness — Deconstructing Claude Code",
  description: "Interactive source code analysis and guided walkthroughs of Claude Code",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </>
  );
}
