import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sale Performance Tracker",
  description: "วัด Sale Performance จาก Sale Order ถึง Delivery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-gray-50 min-h-screen antialiased">
        <main className="flex flex-col items-center px-4 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
