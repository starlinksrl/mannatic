import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  const size = { width: 512, height: 512 }
  return new ImageResponse(
    (
       <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size.width}
        height={size.height}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#64B5F6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v4" />
        <path d="m16.2 7.8 2.9-1.7" />
        <path d="M20 12h4" />
        <path d="m16.2 16.2 2.9 1.7" />
        <path d="M12 20v4" />
        <path d="m7.8 16.2-2.9 1.7" />
        <path d="M4 12H0" />
        <path d="m7.8 7.8-2.9-1.7" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    { ...size, headers: { 'Content-Type': 'image/svg+xml' } }
  )
}
