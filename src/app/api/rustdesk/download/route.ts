import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RUSTDESK_HOST = 'remote.mannatec.it';
const RUSTDESK_RELAY = 'remote.mannatec.it:21117';
const RUSTDESK_KEY = 'xprpBdDVPKwXQd0HBInvLO38hvcT9mkVpBWVFckYkHM=';

// Nome file ufficiale secondo le specifiche RustDesk:
// 1. Prefisso standard 'rustdesk-'
// 2. Specificati sia host rendezvous che relay server
// 3. Trailing comma prima di .exe per proteggere il padding '=' della chiave da eventuali duplicati browser come (1).exe
const OFFICIAL_WINDOWS_FILENAME = `rustdesk-host=${RUSTDESK_HOST},relay=${RUSTDESK_RELAY},key=${RUSTDESK_KEY},.exe`;
const LEGACY_WINDOWS_FILENAME = `MannaTec-Supporto-host=${RUSTDESK_HOST},key=${RUSTDESK_KEY}.exe`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const os = searchParams.get('os') || 'windows';

  if (os === 'mac') {
    return NextResponse.redirect('https://github.com/rustdesk/rustdesk/releases/download/1.5.3/rustdesk-1.5.3-x86_64.dmg');
  }

  if (os === 'mac-arm' || os === 'mac-m1') {
    return NextResponse.redirect('https://github.com/rustdesk/rustdesk/releases/download/1.5.3/rustdesk-1.5.3-aarch64.dmg');
  }

  if (os === 'android') {
    return NextResponse.redirect('https://github.com/rustdesk/rustdesk/releases/download/1.5.3/rustdesk-1.5.3-universal-signed.apk');
  }

  if (os === 'ios') {
    return NextResponse.redirect('https://apps.apple.com/app/rustdesk-remote-desktop/id1581125052');
  }

  const type = searchParams.get('type');
  const isPortable = type === 'portable';

  // Windows: di default serve l'installer autonomo assistenza.exe (con server e password fissa preconfigurati),
  // oppure la versione portatile se esplicitamente richiesta via ?type=portable
  const candidateFiles = isPortable
    ? [OFFICIAL_WINDOWS_FILENAME, LEGACY_WINDOWS_FILENAME]
    : ['assistenza.exe', OFFICIAL_WINDOWS_FILENAME, LEGACY_WINDOWS_FILENAME];

  const searchDirs = [
    path.join(process.cwd(), 'public', 'downloads'),
    '/opt/apps/mannatic/public/downloads',
  ];

  for (const filename of candidateFiles) {
    for (const dir of searchDirs) {
      const fullPath = path.join(dir, filename);
      if (fs.existsSync(fullPath)) {
        try {
          const fileBuffer = fs.readFileSync(fullPath);
          const servedFilename = filename === 'assistenza.exe' ? 'assistenza.exe' : OFFICIAL_WINDOWS_FILENAME;
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': 'application/vnd.microsoft.portable-executable',
              'Content-Disposition': `attachment; filename="${servedFilename}"`,
              'Content-Length': fileBuffer.length.toString(),
              'Cache-Control': 'public, max-age=3600',
            },
          });
        } catch (e) {
          console.error('Error reading RustDesk executable:', e);
        }
      }
    }
  }

  // Fallback se il file locale non fosse presente: redirect al binario ufficiale con nome file suggerito
  return NextResponse.redirect('https://github.com/rustdesk/rustdesk/releases/download/1.5.3/rustdesk-1.5.3-x86_64.exe');
}
