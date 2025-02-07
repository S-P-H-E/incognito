import { NextResponse } from 'next/server';
import axios from 'axios';

const TEMP_MAIL_API = 'https://api.mail.tm';
let cachedEmail = null;
let cachedToken = null;
let lastGenerated = null;

async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
    try {
        return await axios(url, options);
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}

export async function POST() {
    try {
        const now = Date.now();

        // Fetch available domains
        const domainResponse = await fetchWithRetry(`${TEMP_MAIL_API}/domains`);
        const domains = domainResponse.data["hydra:member"];
        if (!domains || domains.length === 0) {
            throw new Error("No domains available from Mail.tm");
        }
        const domain = domains[0].domain;

        // Generate a new email
        const randomEmail = `user${Math.floor(Math.random() * 100000)}@${domain}`;

        // Register the email account
        const userResponse = await fetchWithRetry(`${TEMP_MAIL_API}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: { address: randomEmail, password: 'securepassword123' }
        });

        // Authenticate to get a token
        const tokenResponse = await fetchWithRetry(`${TEMP_MAIL_API}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: { address: randomEmail, password: 'securepassword123' }
        });

        // Cache the email & token
        cachedEmail = randomEmail;
        cachedToken = tokenResponse.data.token;
        lastGenerated = now;

        return NextResponse.json({
            email: cachedEmail,
            token: cachedToken,
            lastGenerated
        });
    } catch (error) {
        console.error("Mail.tm API Error:", error.response?.data || error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        email: cachedEmail,
        token: cachedToken,
        lastGenerated
    });
}
