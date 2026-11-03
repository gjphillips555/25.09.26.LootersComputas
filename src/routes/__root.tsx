import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Toaster } from "sonner";
import { ARTWORK } from "@/lib/artwork";
import { THEME_BOOT_SCRIPT, ThemeProvider, useTheme } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Looters Computas";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Looters Computas" },
      { name: "application-name", content: "Looters Computas" },
      { property: "og:site_name", content: "Looters Computas" },
      { property: "og:title", content: "Looters Computas" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Looters Computas" },
      {
        name: "description",
        content:
          "Looters Computas is a New Zealand marketplace to buy, sell and swap computers, laptops, gaming gear, phones, drones, e-bikes and more. Direct PayPal deals between looters.",
      },
      { name: "theme-color", content: "#f2f2f0" },
      { name: "color-scheme", content: "light dark" },
    ],
    links: [
      { rel: "canonical", href: "https://www.looterscomputas.online/" },
      { rel: "icon", type: "image/svg+xml", href: ARTWORK.favicon },
      { rel: "icon", type: "image/png", sizes: "32x32", href: ARTWORK.faviconPng },
      { rel: "icon", type: "image/png", sizes: "16x16", href: ARTWORK.favicon16 },
      { rel: "apple-touch-icon", href: ARTWORK.appleIcon },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Caveat:wght@700&family=Chakra+Petch:wght@600;700&family=Inter:wght@400;600&family=Lilita+One&family=Sora:wght@600;700&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Looters Computas",
              alternateName: "Looters Computas",
              url: "https://www.looterscomputas.online/",
            }),
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <PreviewHostBridge />
        <ThemeProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
          <ThemedToaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-center"
      toastOptions={{
        className: "bg-card text-foreground border-border",
      }}
    />
  );
}
