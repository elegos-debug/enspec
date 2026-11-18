import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ENSPEC Club Kickoff",
  description: "Register for the ENSPEC English Speakers Community kickoff.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
