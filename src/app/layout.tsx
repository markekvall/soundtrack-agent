import type { Metadata } from "next";
import "./globals.css";
import "./es.css";
import "./soundtrack-agent.css";

export const metadata: Metadata = {
  title: "Soundtrack Agent",
  description:
    "An LLM agent that turns a video brief into a shortlist of Epidemic Sound tracks.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
