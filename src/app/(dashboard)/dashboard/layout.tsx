import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Payment Link",
  description: "Generate a secure, single-use checkout link for your customer.",
};

export default function DashboardPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
