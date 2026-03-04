import type { NextApiRequest, NextApiResponse } from "next";
import { JWT } from "google-auth-library";

export const config = { api: { bodyParser: false } };

const API_URL = process.env.SCORING_API_URL!;

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method Not Allowed: received ${req.method}` });
  }

  try {
    // Leer el cuerpo raw — el browser ya envía multipart/form-data con file + mandante
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);

    const token = await getGCPToken();
    const authHeaders: Record<string, string> = token
      ? { "Authorization": `Bearer ${token}` }
      : {};

    // Forward a Cloud Function (gen2) — retorna JSON directamente
    const contentType = req.headers["content-type"] ?? "multipart/form-data";

    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": contentType,
        "Content-Length": rawBody.length.toString(),
      },
      body: rawBody,
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error(`[score-file] upstream ${upstream.status}:`, body.slice(0, 300));
      return res.status(upstream.status).json({
        error: `Upstream ${upstream.status}`,
        body: body.slice(0, 300),
      });
    }

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
