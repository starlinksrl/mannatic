import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect('https://supporto.mannatec.it/api/rustdesk/download?os=windows');
}
