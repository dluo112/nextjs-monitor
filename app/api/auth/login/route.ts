import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { code: 'Error', msg: 'Login flow has been removed. Please provide Authorization directly.' },
    { status: 410 }
  );
}
