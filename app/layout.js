import "../styles/globals.css";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* <meta name="viewport" content="width=device-width, initial-scale=1.0" /> */}
      </head>
      <body>{children}</body>
    </html>
  );
}
