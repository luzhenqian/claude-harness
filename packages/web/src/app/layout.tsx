import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "claude-harness — Deconstructing Claude Code",
  description: "Interactive source code analysis and guided walkthroughs of Claude Code",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
