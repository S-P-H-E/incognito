import { NextResponse, NextRequest } from 'next/server';
import axios, { AxiosError } from 'axios';

const TEMP_MAIL_API = 'https://api.mail.tm';

export async function GET(req: NextRequest) {
  try {
    // Get token from request headers
    const token = req.headers.get('Authorization');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    // Fetch messages
    const messagesResponse = await axios.get(`${TEMP_MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return NextResponse.json(messagesResponse.data);
  } catch (error: unknown) {
    const err = error as AxiosError;
    if (err.response?.status === 429) {
      return NextResponse.json({ error: "Rate limited. Try again later." }, { status: 429 });
    }
    console.error("Mail.tm Messages Error:", err.response?.data || err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
