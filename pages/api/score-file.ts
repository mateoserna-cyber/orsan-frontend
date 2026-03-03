import type { NextApiRequest, NextApiResponse } from "next";
import { JWT } from "google-auth-library";
import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method Not Allowed: received ${req.method}` });
  }

  const form = formidable({ keepExtensions: true, uploadDir: "/tmp" });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Error parsing form" });
    try {
      const token = await getGCPToken();
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const mandante = Array.isArray(fields.mandante) ? fields.mandante[0] : fields.mandante;

      const fd = new FormData();
      fd.append("file", fs.createReadStream(file!.filepath), file!.originalFilename || "upload.csv");
      fd.append("mandante", mandante!);

      // Convertir el stream a Buffer — fetch nativo de Node 18 no acepta form-data stream directamente
      const fdBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        fd.on("data", (chunk: Buffer) => chunks.push(chunk));
        fd.on("end", () => resolve(Buffer.concat(chunks)));
        fd.on("error", reject);
      });

      const authHeaders: Record<string, string> = token
        ? { "Authorization": `Bearer ${token}` }
        : {};

      const upstream = await fetch(`${API_URL}/api/v1/scoring/file`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "X-API-Key": API_KEY,
          ...fd.getHeaders(),
        },
        body: fdBuffer,
      });

      // El endpoint devuelve CSV — lo convertimos a JSON para el frontend
      const contentType = upstream.headers.get("content-type") ?? "";
      if (!upstream.ok) {
        const body = await upstream.text();
        console.error(`[score-file] upstream ${upstream.status}:`, body.slice(0, 300));
        return res.status(upstream.status).json({ error: `Upstream ${upstream.status}`, body: body.slice(0, 300) });
      }
      if (contentType.includes("text/csv")) {
        const csv = await upstream.text();
        const lines = csv.trim().split("\n");
        const headers = lines[0].split(",");
        const resultados = lines.slice(1).map(line => {
          const vals = line.split(",");
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            const v = vals[i];
            obj[h] = isNaN(Number(v)) || v === "" ? v : Number(v);
          });
          return obj;
        });
        return res.status(200).json({ status: "success", registros_procesados: resultados.length, resultados });
      }

      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
