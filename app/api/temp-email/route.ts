import { NextResponse } from 'next/server';
import axios, { AxiosRequestConfig } from 'axios';

const TEMP_MAIL_API = 'https://api.mail.tm';

// Cache variables with explicit types
let cachedEmail: string | null = null;
let cachedPassword: string | null = null;
let cachedToken: string | null = null;
let lastGenerated: number | null = null;

// Function to generate a random password
function generateRandomPassword(length = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]<>?/=";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generic fetch with retry logic
async function fetchWithRetry(
  url: string,
  options: AxiosRequestConfig = {},
  retries = 3,
  delay = 2000
) {
  try {
    return await axios(url, options);
  } catch (error: any) {
    if (error.response && error.response.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

// POST: Create a new temp email account
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

    // Generate random email + password
    const randomEmail = `user${Math.floor(Math.random() * 100000)}@${domain}`;
    const randomPassword = generateRandomPassword();

    // Create account
    await fetchWithRetry(`${TEMP_MAIL_API}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { address: randomEmail, password: randomPassword }
    });

    // Authenticate for token
    const tokenResponse = await fetchWithRetry(`${TEMP_MAIL_API}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { address: randomEmail, password: randomPassword }
    });

    // Cache the results
    cachedEmail = randomEmail;
    cachedPassword = randomPassword;
    cachedToken = tokenResponse.data.token;
    lastGenerated = now;

    return NextResponse.json({
      email: cachedEmail,
      password: cachedPassword,
      token: cachedToken,
      lastGenerated
    });
  } catch (error: any) {
    console.error("Mail.tm API Error:", error.response?.data || error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Return the cached account info
export async function GET() {
  return NextResponse.json({
    email: cachedEmail,
    password: cachedPassword,
    token: cachedToken,
    lastGenerated
  });
}
