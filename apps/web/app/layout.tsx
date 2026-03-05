import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
// import { AuthProvider } from "@/contexts/AuthContext";
// import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
// import { ThemeProvider } from "@/contexts/ThemeContext";
// import { Toaster } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Realty Genie - Real Estate CRM",
  description:
    "Modern real estate CRM with pipeline management and team collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased`}
      >
        {/* <ThemeProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <TooltipProvider> */}
                {children}
                {/* <Toaster />
              </TooltipProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider> */}
      </body>
    </html>
  );
}