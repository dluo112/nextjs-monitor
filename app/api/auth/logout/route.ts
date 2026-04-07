import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ code: 'Success', msg: 'Authorization should be cleared on the client.' });
}
