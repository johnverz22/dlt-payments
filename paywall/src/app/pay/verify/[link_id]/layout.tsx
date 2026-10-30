import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifying Payment",
};

export default function VerifyByLinkIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
