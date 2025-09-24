import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Emissions Control Tower (Demo)",
  description: "Demo dashboard for methane event triage and SLA tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background-light text-slate-900 transition-colors dark:bg-background-dark dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
