import "server-only";

/**
 * App Store Connect API client.
 *
 * Apple uzywa JWT ES256 podpisywanego kluczem .p8 z 20-minutowym TTL.
 * Doc: https://developer.apple.com/documentation/appstoreconnectapi
 *
 * Uwagi:
 *  - klucz .p8 ma format PEM (-----BEGIN PRIVATE KEY-----...). Importujemy
 *    przez `crypto.subtle.importKey` w runtime nodejs (NIE edge).
 *  - JWT audience to `appstoreconnect-v1`.
 *  - Wszystkie endpointy zaczynaja sie od https://api.appstoreconnect.apple.com/v1/
 */

const ASC_API_BASE = "https://api.appstoreconnect.apple.com/v1";

type AscCredentials = {
  keyId: string;
  issuerId: string;
  privateKeyPem: string;
};

let cachedJwt: { token: string; expiresAt: number } | null = null;

async function createAscJwt(creds: AscCredentials): Promise<string> {
  // Cache token na 18 minut (ASC limit 20min).
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now + 60) {
    return cachedJwt.token;
  }

  const header = { alg: "ES256", kid: creds.keyId, typ: "JWT" };
  const payload = {
    iss: creds.issuerId,
    iat: now,
    exp: now + 18 * 60,
    aud: "appstoreconnect-v1",
  };

  const b64 = (s: string) =>
    Buffer.from(s).toString("base64url");

  const signingInput = `${b64(JSON.stringify(header))}.${b64(
    JSON.stringify(payload),
  )}`;

  // Importujemy klucz PEM jako ECDSA P-256.
  // Node 18+ ma webcrypto pod globalnym `crypto.subtle`.
  const pem = creds.privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyBuffer = Buffer.from(pem, "base64");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const sigB64 = Buffer.from(signature).toString("base64url");
  const token = `${signingInput}.${sigB64}`;

  cachedJwt = { token, expiresAt: now + 18 * 60 };
  return token;
}

export class AscClient {
  constructor(private creds: AscCredentials) {}

  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await createAscJwt(this.creds);
    const res = await fetch(`${ASC_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ASC ${method} ${path} failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<T>;
  }

  /** Lista appow uzytkownika — sluzy do wykrywania czy aplikacja juz istnieje. */
  async listApps(): Promise<{ data: Array<{ id: string; attributes: { name: string; bundleId: string } }> }> {
    return this.request("GET", "/apps");
  }

  /**
   * Stworz pre-release versions (przed pierwszym buildem). Po pierwszym buildzie
   * App Store Connect ma juz app ID, nastepne zmiany leca przez `/builds`.
   */
  async createAppStoreVersion(appId: string, version: string): Promise<{ data: { id: string } }> {
    return this.request("POST", "/appStoreVersions", {
      data: {
        type: "appStoreVersions",
        attributes: { platform: "IOS", versionString: version },
        relationships: { app: { data: { type: "apps", id: appId } } },
      },
    });
  }

  async submitForBetaReview(buildId: string): Promise<{ data: { id: string } }> {
    return this.request("POST", "/betaAppReviewSubmissions", {
      data: {
        type: "betaAppReviewSubmissions",
        relationships: { build: { data: { type: "builds", id: buildId } } },
      },
    });
  }
}
