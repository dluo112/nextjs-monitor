import { NextResponse } from 'next/server';
import { API_URLS } from '@/lib/autodl';
import { getTokenCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization");

    if (!token) {
      return NextResponse.json({ code: "Error", msg: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(API_URLS.machine_list, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': token,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Machine list error:", error);
    return NextResponse.json({ code: "Error", msg: "Internal Server Error" }, { status: 500 });
  }
}
