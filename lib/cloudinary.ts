import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary integration — trwale przechowywanie obrazow projektowych.
 *
 * DALL-E URLs wygasaja po ~1h. Po wygenerowaniu obrazu od razu wrzucamy go
 * do Cloudinary (uploader.upload przyjmuje surowy URL i sam pobiera plik),
 * a zwracamy stabilny secure_url z CDN-a.
 *
 * Konfiguracja (jedna z dwoch opcji):
 *
 * A) Jedna zmienna jak w panelu Cloudinary (preferred):
 *    CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 *
 * B) Rozbite na trzy (np. Vercel bez pelnego URL):
 *    CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *
 * Jezeli zadna opcja nie jest kompletna -> isCloudinaryConfigured() zwraca false
 * i caller uzyje surowego URL-a DALL-E jako fallback.
 */

let configured = false;

/** cloudinary://api_key:api_secret@cloud_name */
function parseCloudinaryUrl(
  raw: string,
): { cloud_name: string; api_key: string; api_secret: string } | null {
  const url = raw.trim();
  if (!url.startsWith("cloudinary://")) return null;
  const rest = url.slice("cloudinary://".length);
  const at = rest.lastIndexOf("@");
  if (at <= 0) return null;
  const host = rest.slice(at + 1).split("/")[0]?.split("?")[0];
  if (!host) return null;
  const keySecret = rest.slice(0, at);
  const colon = keySecret.indexOf(":");
  if (colon <= 0) return null;
  const apiKey = keySecret.slice(0, colon);
  const apiSecret = decodeURIComponent(keySecret.slice(colon + 1));
  if (!apiKey || !apiSecret) return null;
  return { cloud_name: host, api_key: apiKey, api_secret: apiSecret };
}

function getCloudinaryCredentials():
  | { cloud_name: string; api_key: string; api_secret: string }
  | null {
  const fromUrl = process.env.CLOUDINARY_URL;
  if (fromUrl) {
    const parsed = parseCloudinaryUrl(fromUrl);
    if (parsed) return parsed;
  }
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (cloud_name && api_key && api_secret) {
    return { cloud_name, api_key, api_secret };
  }
  return null;
}

function ensureConfigured() {
  if (configured) return;
  const creds = getCloudinaryCredentials();
  if (!creds) {
    throw new Error("Cloudinary credentials missing");
  }
  cloudinary.config({
    cloud_name: creds.cloud_name,
    api_key: creds.api_key,
    api_secret: creds.api_secret,
    secure: true,
  });
  configured = true;
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryCredentials() !== null;
}

/**
 * Re-hostuje obraz (zazwyczaj z DALL-E) w Cloudinary pod folderem projektu.
 *
 * @returns stabilny https URL z CDN-a Cloudinary
 * @throws gdy upload sie nie powiedzie (caller powinien zlapac i fallback do oryginalu)
 */
export async function uploadImageToCloudinary(
  sourceUrl: string,
  projectId: string,
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured (missing env vars)");
  }
  ensureConfigured();

  const result = await cloudinary.uploader.upload(sourceUrl, {
    folder: `wybitnastrona/projects/${projectId}`,
    resource_type: "image",
    overwrite: false,
    unique_filename: true,
    use_filename: false,
    timeout: 25_000,
  });

  return result.secure_url;
}

/**
 * Wgrywa surowy `Buffer` (np. PNG screenshot z Puppeteera) do Cloudinary.
 *
 * Uzywa stabilnego `public_id = projectId` — kazda kolejna publikacja
 * NADPISUJE poprzedni screenshot (overwrite: true). Dzieki temu:
 *   1. nie zaśmiecamy konta Cloudinary
 *   2. URL pozostaje stabilny (mozemy cachowac w DB bez timestampow)
 *
 * @throws gdy Cloudinary nie jest skonfigurowany lub upload sie nie powiedzie
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  projectId: string,
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured (missing env vars)");
  }
  ensureConfigured();

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `wybitnastrona/screenshots`,
        public_id: projectId,
        resource_type: "image",
        overwrite: true,
        timeout: 25_000,
        // Cache-buster nie potrzebny — Cloudinary updateuje version w URL po
        // overwrite, wiec wystarczy ze zapiszemy nowy `secure_url`.
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}
