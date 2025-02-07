import { NextResponse } from 'next/server';
import axios from 'axios';

const TEMP_MAIL_API = 'https://api.mail.tm';

export async function GET(req) {
    try {
        // Get token from request headers
        const token = req.headers.get('Authorization');
        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        }

        // Fetch messages with retry logic
        const messagesResponse = await axios.get(`${TEMP_MAIL_API}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return NextResponse.json(messagesResponse.data);
    } catch (error) {
        if (error.response?.status === 429) {
            return NextResponse.json({ error: "Rate limited. Try again later." }, { status: 429 });
        }
        console.error("Mail.tm Messages Error:", error.response?.data || error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
