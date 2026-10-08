import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'mannatic.apk'),
    path.join(process.cwd(), 'android', 'mannatic.apk'),
    '/opt/apps/mannatic/public/mannatic.apk',
  ];

  let targetPath = possiblePaths.find(p => fs.existsSync(p));

  if (!targetPath) {
    return new NextResponse('APK not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(targetPath);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="mannatic.apk"',
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
