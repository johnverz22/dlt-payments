import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to DLT Pay with your merchant credentials to manage payment links.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
