import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RUSTDESK_HOST = 'remote.mannatec.it';
const RUSTDESK_KEY = 'xprpBdDVPKwXQd0HBInvLO38hvcT9mkVpBWVFckYkHM=';

const PRECONFIGURED_WINDOWS_FILENAME = `MannaTec-Supporto-host=${RUSTDESK_HOST},key=${RUSTDESK_KEY}.exe`;

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

  // Windows preconfigurato
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'downloads', PRECONFIGURED_WINDOWS_FILENAME),
    path.join('/opt/apps/mannatic/public/downloads', PRECONFIGURED_WINDOWS_FILENAME),
  ];

  let filePath = candidatePaths.find(p => fs.existsSync(p));

  if (filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/vnd.microsoft.portable-executable',
          'Content-Disposition': `attachment; filename="${PRECONFIGURED_WINDOWS_FILENAME}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (e) {
      console.error('Error reading RustDesk preconfigured executable:', e);
    }
  }

  // Fallback se il file locale non fosse presente: redirect al binario ufficiale con nome file suggerito
  return NextResponse.redirect('https://github.com/rustdesk/rustdesk/releases/download/1.5.3/rustdesk-1.5.3-x86_64.exe');
}
