import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PunithRaj - Job Portal",
  description:
    "Discover opportunities, manage applications, and build your next team.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
