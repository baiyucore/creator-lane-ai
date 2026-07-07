import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '../components/auth-provider';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../components/theme-provider';

export const metadata: Metadata = {
  title: '创作平台',
  description: '创作平台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full" suppressContentEditableWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
            <Toaster richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
