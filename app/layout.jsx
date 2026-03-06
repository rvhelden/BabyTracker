import "./globals.css";
import { LocaleProvider } from "../components/LocaleContext.jsx";
import PwaRegistration from "../components/PwaRegistration";
import { getUser } from "../lib/session.js";

export const metadata = {
  title: "Baby Tracker",
  description: "Track your baby's weight and growth",
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({ children }) {
  const user = await getUser();
  const lang = user?.locale || "en";

  return (
    <html lang={lang}>
      <head>
        <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover' />
        <meta name='theme-color' content='#6c8ebf' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Baby Tracker' />
        <link rel='apple-touch-icon' href='/icon.svg' />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='' />
        <link
          href='https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;600;700;800&display=swap'
          rel='stylesheet'
        />
      </head>
      <body>
        <LocaleProvider locale={user?.locale}>
          <PwaRegistration />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
