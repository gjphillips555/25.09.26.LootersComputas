import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Toaster } from "sonner";
import { SiftahFrame } from "@/components/siftah/frame";
import { THEME_BOOT_SCRIPT, ThemeProvider, useTheme } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Looters Computas";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Siftah Solutions · looterscomputas.online" },
      { name: "application-name", content: "Siftah Solutions" },
      { property: "og:site_name", content: "Siftah Solutions · looterscomputas.online" },
      { property: "og:title", content: "Siftah Solutions · looterscomputas.online" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Siftah Solutions · looterscomputas.online" },
      {
        name: "description",
        content:
          "Siftah Solutions (trading as Looters Computas) is a New Zealand marketplace and maker hub: true-size NZ plate stickers, an arcade, Siftah AI chat and a marketplace to buy, sell and swap computers, laptops, gaming gear, phones, drones, e-bikes and more. Direct PayPal deals between looters.",
      },
      { name: "theme-color", content: "#0b0b0c" },
      { name: "color-scheme", content: "light dark" },
    ],
    links: [
      { rel: "canonical", href: "https://www.looterscomputas.online/" },
      { rel: "icon", type: "image/svg+xml", href: "/brand/siftah-mark.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/brand/siftah-mark-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/brand/siftah-mark-16.png" },
      { rel: "apple-touch-icon", href: "/brand/siftah-mark-180.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Archivo+Black&family=Caveat:wght@700&family=Chakra+Petch:wght@600;700&family=Inter:wght@400;600&family=Lilita+One&family=Sora:wght@600;700&display=swap",
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
              name: "Siftah Solutions",
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
            <SiftahFrame>
              <Outlet />
            </SiftahFrame>
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
