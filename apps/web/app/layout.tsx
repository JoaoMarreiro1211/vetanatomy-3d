import React from "react";
import "./globals.css";
import Providers from "./providers";
import { AppShell } from "../components/layout/app-shell";

export const metadata = {
  title: "VetAnatomy 3D",
  description: "Plataforma de gestao hospitalar veterinaria com gemeo digital 3D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
