import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carecell — Care that connects",
  description: "Personalized, connected healthcare with people at the center. Discover care and support designed around you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
