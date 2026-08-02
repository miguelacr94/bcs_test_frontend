import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import { Toaster } from "@/components/ui/toast";
import { Navbar } from "@/components/layout/navbar";
import { RoleProvider } from "@/providers/role-provider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "BCS Motor de Solicitudes",
  description: "Sistema de gestión de solicitudes de crédito",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground selection:bg-primary/30 selection:text-foreground">
        <RoleProvider>
          <QueryProvider>
            <Navbar />
            {children}
            <Toaster />
          </QueryProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
