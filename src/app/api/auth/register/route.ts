import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'Registration is not enabled. Use OTP login or contact admin.' },
    { status: 501 }
  );
}