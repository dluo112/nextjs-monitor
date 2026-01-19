import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { machine_name, instance_uuid, to } = await request.json();

    if (!to) {
      return NextResponse.json({ code: "Error", msg: "No email address provided" }, { status: 400 });
    }

    const subject = `[GPU实例已开机] ${machine_name}`;
    const text = `实例已成功启动！\n\n机器名称: ${machine_name}\n实例UUID: ${instance_uuid}\n启动时间: ${new Date().toLocaleString('zh-CN')}`;

    const success = await sendEmail({ to, subject, text });

    if (success) {
      return NextResponse.json({ code: "Success", msg: "Email sent" });
    } else {
      return NextResponse.json({ code: "Error", msg: "Failed to send email" }, { status: 500 });
    }

  } catch (error) {
    console.error("Email notification error:", error);
    return NextResponse.json({ code: "Error", msg: "Internal Server Error" }, { status: 500 });
  }
}
