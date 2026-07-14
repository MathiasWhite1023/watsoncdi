import type { Metadata } from "next";
import { headers } from "next/headers";
import "./carbon.scss";
import "@carbon/charts-react/styles.css";
import "./globals.css";
import "./v5.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "watson Account Intelligence";
  const description = "Inteligência proativa de contas antes do CRM: memória, stakeholders, reuniões, hipóteses, temas IBM e próximos passos fundamentados.";
  const image = `${origin}/og-v5.png`;

  return {
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", url: origin, images: [{ url: image, width: 1672, height: 941, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
