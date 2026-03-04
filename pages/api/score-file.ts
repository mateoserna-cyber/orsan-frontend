import type { NextApiRequest, NextApiResponse } from "next";
import { createSign } from "crypto";

export const config = { api: { bodyParser: false } };

const API_URL = process.env.SCORING_API_URL!;

async function getGCPToken(): Promise<string | null> {
  try {
    const sa = JSON.parse(process.env.GCP_SA_KEY!);
    // Normalizar newlines — Vercel a veces guarda \\n en lugar de \n
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
    if (!data.id_token) throw new Error(`No id_token in response: ${JSON.stringify(data)}`);
    console.log("[getGCPToken] OK, prefix:", data.id_token.slice(0, 20));
    return data.id_token;
  } catch (e: any) {
    console.error("[getGCPToken] error:", e.message);
    // Diagnóstico temporal — remover luego
    const raw = process.env.GCP_SA_KEY ?? "";
    console.error("[getGCPToken] SA_KEY length:", raw.length, "starts:", raw.slice(0, 5), "API_URL:", process.env.SCORING_API_URL?.slice(0, 40));
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
