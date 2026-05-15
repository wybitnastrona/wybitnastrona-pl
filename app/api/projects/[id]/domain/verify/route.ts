import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { getDomainConfig, verifyDomain } from "@/lib/vercel";

type Params = Promise<{ id: string }>;

const EXPECTED_CNAME = "cname.vercel-dns.com";
const EXPECTED_A_VALUES = ["76.76.21.21"];

/**
 * Zapytanie DNS przez Cloudflare DNS-over-HTTPS (publiczne, bez kluczy).
 * Zwraca recordy danego typu albo pusta liste jezeli DoH nie odpowiedzialo
 * (offline, blokada itp.) — wtedy uznajemy ze nie udalo nam sie potwierdzic.
 *
 * Doc: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/
 */
async function dohQuery(
  name: string,
  type: "CNAME" | "A",
): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/dns-json" },
      // Cache miss to zawsze zywy DNS — chcemy widziec propagacje.
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      Answer?: { data: string; type: number }[];
    };
    return (json.Answer ?? []).map((a) => a.data.trim().replace(/\.$/, ""));
  } catch {
    return [];
  }
}

/**
 * Sprawdz czy DNS dla `domain` rzeczywiscie wskazuje na Vercela. Wymagamy
 * conajmniej jednego z:
 *  - CNAME → cname.vercel-dns.com
 *  - A     → 76.76.21.21
 *
 * Nie ufamy slepo Vercel API (`verifyDomain`), bo gdy `VERCEL_TOKEN` nie
 * jest skonfigurowany API moze zwrocic 200/404 i kod traktowal je jak
 * "OK". Tu egzekwujemy stan po stronie DNS.
 */
async function checkDnsActual(domain: string): Promise<{
  dnsResolved: boolean;
  cnames: string[];
  aRecords: string[];
}> {
  const [cnames, aRecords] = await Promise.all([
    dohQuery(domain, "CNAME"),
    dohQuery(domain, "A"),
  ]);

  const cnameOk = cnames.some(
    (c) => c.toLowerCase() === EXPECTED_CNAME.toLowerCase(),
  );
  const aOk = aRecords.some((a) => EXPECTED_A_VALUES.includes(a));

  return { dnsResolved: cnameOk || aOk, cnames, aRecords };
}

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getProject(id);
  if (!project || project.user_id !== user.id || !project.custom_domain) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const domain = project.custom_domain;

  // Real DNS check przez Cloudflare DoH — niezalezne od Vercel API.
  const dns = await checkDnsActual(domain);

  // Wciaz pytamy Vercela, bo daje informacje o "misconfigured" i "configuredBy"
  // ale wynik DNS-a jest finalnym verdyktem `verified`.
  const config = await getDomainConfig(domain);
  const vercelVerify = await verifyDomain(domain);

  // Verified TYLKO gdy DNS sie zgadza. Vercel verify jest dodatkowym
  // sygnalem (np. weryfikacja TXT) — nigdy nie uznajemy domeny za
  // zweryfikowana bez prawidlowego DNS.
  const verified = dns.dnsResolved && vercelVerify.verified;

  if (verified) {
    await supabase
      .from("projects")
      .update({ custom_domain_verified_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({
    verified,
    dnsResolved: dns.dnsResolved,
    vercelVerified: vercelVerify.verified,
    misconfigured: config?.misconfigured ?? false,
    configuredBy: config?.configuredBy ?? null,
    actual: {
      cnames: dns.cnames,
      aRecords: dns.aRecords,
    },
    expected: {
      cnames: [EXPECTED_CNAME],
      aValues: EXPECTED_A_VALUES,
    },
  });
}
