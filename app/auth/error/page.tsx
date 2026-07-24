import Link from "next/link";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveRequestLocale } from "../../../lib/i18n";

const copy = {
  "en-US": {
    title: "We could not complete sign-in",
    body: "The authentication session may have expired or IBM App ID may still need configuration.",
    action: "Return to Watson CDI",
  },
  "pt-BR": {
    title: "Não foi possível concluir o acesso",
    body: "A sessão de autenticação pode ter expirado ou o IBM App ID ainda precisa ser configurado.",
    action: "Voltar ao Watson CDI",
  },
};

export default async function AuthenticationErrorPage() {
  const cookieStore = await cookies();
  const locale = resolveRequestLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
  });
  const localized = copy[locale];
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f4f4",
        color: "#161616",
        padding: "clamp(2rem, 8vw, 8rem)",
        fontFamily: '"IBM Plex Sans", sans-serif',
      }}
    >
      <section
        style={{
          maxWidth: "42rem",
          borderTop: "4px solid #0f62fe",
          background: "#ffffff",
          padding: "2rem",
        }}
      >
        <p style={{ color: "#525252", marginTop: 0 }}>Watson CDI</p>
        <h1 style={{ fontSize: "2rem", fontWeight: 400 }}>
          {localized.title}
        </h1>
        <p style={{ lineHeight: 1.5 }}>{localized.body}</p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            background: "#0f62fe",
            color: "#ffffff",
            padding: "0.875rem 1rem",
            textDecoration: "none",
          }}
        >
          {localized.action}
        </Link>
      </section>
    </main>
  );
}
