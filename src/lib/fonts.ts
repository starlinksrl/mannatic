
import { Inter, Lato, Roboto_Slab, Playfair_Display, Source_Code_Pro } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato' });
const roboto_slab = Roboto_Slab({ subsets: ['latin'], variable: '--font-roboto-slab' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const source_code = Source_Code_Pro({ subsets: ['latin'], variable: '--font-source-code' });


export const fonts = [
  { name: 'default', label: 'Default', variable: inter.variable },
  { name: 'lato', label: 'Lato', variable: lato.variable },
  { name: 'roboto', label: 'Roboto Slab', variable: roboto_slab.variable },
  { name: 'playfair', label: 'Playfair Display', variable: playfair.variable },
  { name: 'sourcecode', label: 'Source Code Pro', variable: source_code.variable },
] as const;
