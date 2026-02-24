import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ADO Health ICMR",
  description: "ADO Health ICMR Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Inline SVG favicon to avoid missing /favicon.ico requests during development */}
        <link
          rel="icon"
          href={"data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"#08306b\"/><text x=\"50\" y=\"58\" font-size=\"52\" text-anchor=\"middle\" fill=\"#ffd54a\" font-family=\"Arial, Helvetica, sans-serif\">A</text></svg>')}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
