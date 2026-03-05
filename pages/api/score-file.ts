import type { NextApiRequest, NextApiResponse } from "next";
import { createSign } from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

const API_URL = (process.env.SCORING_API_URL ?? "").trim();

async function getGCPToken(): Promise<string | null> {
  try {
    const sa = JSON.parse(process.env.GCP_SA_KEY!);
    const key = (sa.private_key as string).replace(/\\n/g, "\n");
    const email = sa.client_email as string;
    const now = Math.floor(Date.now() / 1000);

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const claim  = Buffer.from(JSON.stringify({
      iss: email, sub: email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now, exp: now + 3600,
      target_audience: API_URL,
    })).toString("base64url");

    const toSign = `${header}.${claim}`;
    const sig = createSign("SHA256").update(toSign).sign(key).toString("base64url");
    const assertion = `${toSign}.${sig}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const data = await res.json() as Record<string, string>;
    if (!data.id_token) throw new Error(`No id_token: ${JSON.stringify(data)}`);
    return data.id_token;
  } catch (e: any) {
    console.error("[getGCPToken] error:", e.message);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const token = await getGCPToken();
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
