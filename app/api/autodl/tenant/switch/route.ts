import { NextResponse } from 'next/server';
import { API_URLS } from '@/lib/autodl';

export async function POST(request: Request) {
  try {
    const token = request.headers.get("Authorization");
    const body = await request.json();
    const { tenant_uuid } = body;

    if (!token) {
      return NextResponse.json({ code: "Error", msg: "Unauthorized" }, { status: 401 });
    }

    if (!tenant_uuid) {
      return NextResponse.json({ code: "Error", msg: "Tenant UUID is required" }, { status: 400 });
    }

    const res = await fetch(API_URLS.switch_tenant, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': token,
      },
      body: JSON.stringify({ tenant_uuid }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Switch tenant error:", error);
    return NextResponse.json({ code: "Error", msg: "Internal Server Error" }, { status: 500 });
  }
}
