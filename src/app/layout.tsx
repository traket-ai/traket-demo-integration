import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Traket Demo Integration",
  description: "A simple chat demo that will later show Traket SDK metering."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
