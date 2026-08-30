import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFC Redirect",
  description: "Redirecciones NFC con estadísticas para locales",
  robots: { index: false, follow: false },
  // Para que al instalarlo en el celular se abra sin la barra del navegador.
  applicationName: "NFC",
  appleWebApp: { capable: true, title: "NFC", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
