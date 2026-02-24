import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PH Core – Gestión de Asambleas",
  description: "Plataforma inteligente para la gestión de asambleas de propiedad horizontal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Suppress Next.js hydration warnings for the dynamic icon injection */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var m = window.matchMedia('(prefers-color-scheme: dark)');
                  var setIcon = function(e) {
                    var isDark = e.matches;
                    var link = document.querySelector("link[rel~='icon']");
                    if (!link) {
                      link = document.createElement('link');
                      link.rel = 'icon';
                      document.head.appendChild(link);
                    }
                    link.href = isDark ? '/icon.png?v=' + Date.now() : '/icon-dark.png?v=' + Date.now();
                  };
                  m.addEventListener('change', setIcon);
                  setIcon(m);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
