import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Lato, Roboto_Slab, Playfair_Display, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/contexts/user-context';
import { ThemeProvider } from '@/contexts/theme-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato' });
const roboto_slab = Roboto_Slab({ subsets: ['latin'], variable: '--font-roboto-slab' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const source_code = Source_Code_Pro({ subsets: ['latin'], variable: '--font-source-code' });


export const metadata: Metadata = {
  title: 'MannaTic',
  description: 'Gestione interventi e manutenzioni smart.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        'min-h-screen bg-background font-body antialiased', 
        inter.variable, 
        spaceGrotesk.variable,
        lato.variable,
        roboto_slab.variable,
        playfair.variable,
        source_code.variable
        )}>
        <UserProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
