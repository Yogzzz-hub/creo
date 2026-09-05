import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS via STARTTLS
  auth: {
    user: process.env.SMTP_USERNAME || "creotool26@gmail.com",
    pass: process.env.SMTP_PASSWORD || "gcic myxm rrep lorb",
  },
})

export async function POST(req: Request) {
  try {
    const { to, subject, html, secret } = await req.json()

    // Validate internal secret to prevent unauthorized public access
    if (secret !== "creo-internal-secret-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const info = await transporter.sendMail({
      from: '"Creo" <creotool26@gmail.com>',
      to,
      subject,
      html,
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    console.error("Vercel email bridge error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to send email" },
      { status: 500 }
    )
  }
}
