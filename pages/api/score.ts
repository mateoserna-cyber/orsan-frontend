import type { NextApiRequest, NextApiResponse } from "next";
import { JWT } from "google-auth-library";

const API_URL = process.env.SCORING_API_URL!;
const API_KEY = process.env.SCORING_API_KEY!;

async function getGCPToken(): Promise<string | null> {
  try {
    const raw = process.env.GCP_SA_KEY!;
    const sa = typeof raw === "string" ? JSON.parse(raw) : raw;
    const client = new JWT({
      email: sa.client_email,
      key: sa.private_key,
    });
    return await client.fetchIdToken(API_URL);
  } catch (e: any) {
    console.error("[getGCPToken] error:", e.message);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const token = await getGCPToken();
    const authHeaders: Record<string, string> = token
      ? { "Authorization": `Bearer ${token}` }
      : {};
    const upstream = await fetch(`${API_URL}/api/v1/scoring/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(req.body),
    });
    if (!upstream.ok) {
      const body = await upstream.text();
      console.error(`[score] upstream ${upstream.status}:`, body.slice(0, 300));
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}`, body: body.slice(0, 300) });
    }
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
