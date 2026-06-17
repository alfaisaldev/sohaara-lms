import { NextRequest, NextResponse } from 'next/server';
import mime from 'mime-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATIC_CONTENT_EXTENSIONS = ['.js', '.css', '.html', '.htm', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.mp4', '.webm', '.woff', '.woff2', '.ttf', '.eot', '.json', '.xml', '.xhtml'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const scormPath = path.join('/');
  const target = `${API_URL}/uploads/scorm/${scormPath}`;

  try {
    const res = await fetch(target);
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const lastSegment = path.slice(-1)[0];
    const fileName = lastSegment ?? '';
    const ext = '.' + (fileName.split('.').pop() || '');
    const mimeType = STATIC_CONTENT_EXTENSIONS.includes(ext)
      ? (mime.lookup(ext) || 'application/octet-stream')
      : (res.headers.get('content-type') || 'application/octet-stream');

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 502 });
  }
}
