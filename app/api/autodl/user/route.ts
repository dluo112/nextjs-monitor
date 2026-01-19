import { NextResponse } from 'next/server';
import { API_URLS } from '@/lib/autodl';

export async function POST(request: Request) {
  try {
    const token = request.headers.get("Authorization");

    if (!token) {
      return NextResponse.json({ code: "Error", msg: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(API_URLS.user_info, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': token,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    console.log("User Info Response:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("User info error:", error);
    return NextResponse.json({ code: "Error", msg: "Internal Server Error" }, { status: 500 });
  }
}
