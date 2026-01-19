import { NextResponse } from 'next/server';
import { API_URLS } from '@/lib/autodl';

export async function POST(request: Request) {
  try {
    const { phone, password, inviteCode, phone_area = '+86' } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ code: "Error", msg: "请输入邀请码" }, { status: 400 });
    }

    const VALID_INVITE_CODES = process.env.INVITE_CODES ? process.env.INVITE_CODES.split(',') : ["AUTODL2024", "VIP888"];
    if (!VALID_INVITE_CODES.includes(inviteCode)) {
      return NextResponse.json({ code: "Error", msg: "邀请码无效" }, { status: 403 });
    }

    if (!phone || !password) {
      return NextResponse.json({ code: "Error", msg: "Missing phone or password" }, { status: 400 });
    }

    const hashedPassword = password;

    // Step 1: Login V1
    const v1Res = await fetch(API_URLS.login_v1, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: hashedPassword,
        phone,
        phone_area,
        picture_id: null,
        v_code: ""
      }),
    });
    const v1Data = await v1Res.json();
    if (v1Data.code !== "Success") {
      return NextResponse.json(v1Data); // Forward error
    }
    console.log("Login V1 Response:", v1Data);
    const ticket = v1Data.data.ticket;

    // Step 2: Passport (Get Token)
    const passportRes = await fetch(API_URLS.passport, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    });
    const passportData = await passportRes.json();
    
    if (passportData.code !== "Success") {
      return NextResponse.json(passportData);
    }

    const token = passportData.data.token;

    // Step 3: SSO Ticket
    const ssoTicketRes = await fetch(API_URLS.sso_ticket, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': token 
      },
      body: JSON.stringify({}),
    });
    
    const ssoTicketData = await ssoTicketRes.json();

    if (ssoTicketData.code !== "Success") {
        return NextResponse.json(ssoTicketData);
    }

    const ssoTicket = ssoTicketData.data.ticket;
    
    // Step 4: Login V2 (Finalize)
    const v2Res = await fetch(API_URLS.login_v2, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': token 
      },
      body: JSON.stringify({
        ticket: ssoTicket,
        third_party_login: false,
      }),
    });

    const v2Data = await v2Res.json();

    if (v2Data.code !== "Success") {
      return NextResponse.json(v2Data);
    }

    const finalToken = v2Data.data.token;

    return NextResponse.json({ code: "Success", msg: "Login successful", data: { token: finalToken } });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ code: "Error", msg: "Internal Server Error" }, { status: 500 });
  }
}
