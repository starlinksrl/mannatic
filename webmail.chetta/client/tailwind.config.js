import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        outlook: {
          blue: '#0078d4',
          darkBlue: '#106ebe',
          lightBlue: '#deecf9',
          hover: '#f3f2f1',
          selected: '#edebe9',
          border: '#edebe9',
          darkBg: '#201f1e',
          darkSidebar: '#1b1a19',
          darkPanel: '#252423',
          darkBorder: '#323130',
          darkHover: '#292827',
          darkSelected: '#373533'
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
