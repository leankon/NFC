import type { MetadataRoute } from "next";

/**
 * Permite instalar el sitio en la pantalla de inicio del celular: se abre
 * sin la barra del navegador y con su propio ícono, como una app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NFC Redirect",
    short_name: "NFC",
    description: "Redirecciones NFC y estadísticas de escaneos",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
