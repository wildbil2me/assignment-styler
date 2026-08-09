import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blackbaud Content Composer",
  description: "Create polished, student-facing content and copy Blackbaud-safe HTML.",
  metadataBase: new URL("https://content-composer.sites.openai.com"),
  openGraph: {
    title: "Blackbaud Content Composer",
    description: "Beautiful class content. Blackbaud-safe HTML.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blackbaud Content Composer",
    description: "Beautiful class content. Blackbaud-safe HTML.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
