import { NextResponse } from 'next/server';
import { API_URLS } from '@/lib/autodl';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization');

    if (!token) {
      return NextResponse.json({ code: 'Error', msg: 'Unauthorized' }, { status: 401 });
    }

    const { instance_uuid } = await request.json();

    const res = await fetch(API_URLS.power_on, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: token,
      },
      body: JSON.stringify({
        instance_uuid,
        start_mode: 'gpu',
      }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Power on error:', error);
    return NextResponse.json({ code: 'Error', msg: 'Internal Server Error' }, { status: 500 });
  }
}
