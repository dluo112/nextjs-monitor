import { NextResponse } from 'next/server';
import { deleteTokenCookie } from '@/lib/auth';

export async function POST() {
  deleteTokenCookie();
  return NextResponse.json({ code: "Success", msg: "Logged out" });
}
