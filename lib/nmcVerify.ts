// Doctor registration verification against the Indian Medical Register (IMR).
//
// IMPORTANT — read before relying on this in production:
// The NMC does NOT publish an official, contractual verification API. This uses
// the same *unofficial* REST endpoint that the public IMR search page
// (https://www.nmc.org.in/information-desk/indian-medical-register/) calls:
//   POST /MCIRest/open/getDataFromService?service=searchDoctor  body {"registrationNo": "..."}
// It currently returns full registrant records (name, council, year), but being
// unofficial it can rate-limit, block, or change shape without notice — so this
// module "fails open to manual review" rather than wrongly rejecting a real doctor.
//
// Note: a registration number is NOT unique across state medical councils, so a
// match requires the registration number PLUS agreement on council and/or name.
//
// For a contractual SLA, plug in a paid wrapper (e.g. Surepass / Decentro) by
// setting NMC_VERIFY_API_URL + NMC_VERIFY_API_KEY; that path is tried first.
//
// Outcome semantics:
//   MATCHED       -> registration number found and the registrant looks like this doctor
//   NOT_FOUND     -> endpoint responded but no matching record (likely invalid number)
//   INCONCLUSIVE  -> we couldn't reach/parse a reliable answer -> needs manual review

import https from 'https'
import tls from 'tls'
import { NMC_CA_CHAIN } from './nmcCa'

export type VerificationOutcome = 'MATCHED' | 'NOT_FOUND' | 'INCONCLUSIVE'

export interface VerificationInput {
  registrationNumber: string
  name?: string | null
  medicalCouncil?: string | null
  registrationYear?: number | null
}

export interface VerificationResult {
  outcome: VerificationOutcome
  matchedName?: string
  matchedCouncil?: string
  matchedYear?: string
  source: 'provider' | 'nmc-public' | 'none'
  detail?: string
}

const NMC_PUBLIC_URL = 'https://www.nmc.org.in/MCIRest/open/getDataFromService?service=searchDoctor'
const TIMEOUT_MS = 12_000

// nmc.org.in serves an INCOMPLETE certificate chain (leaf only, missing the
// Sectigo intermediate), so Node's fetch fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
// We supply the missing intermediate + root ourselves and keep full TLS
// verification on — disabling it would let a MITM forge a "verified" result and
// get a fake doctor access to patient data.
let nmcCa: string[] | undefined
function getNmcCa(): string[] {
  if (nmcCa) return nmcCa
  nmcCa = [...tls.rootCertificates, NMC_CA_CHAIN]
  return nmcCa
}

// HTTPS POST returning parsed JSON, with our CA bundle and a hard timeout.
function nmcPostJson(url: string, body: string, headers: Record<string, string>): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        ca: getNmcCa(),
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => {
          let json: any = null
          try { json = JSON.parse(data) } catch { /* leave null */ }
          resolve({ status: res.statusCode || 0, json })
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('NMC request timed out')))
    req.write(body)
    req.end()
  })
}

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/^dr\.?\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

// Registration numbers can contain letters, slashes and spaces; compare on
// alphanumerics only so "MH-12345" and "MH 12345" are treated as equal.
function normReg(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

// --- Optional paid provider (recommended for production) -----------------------
async function verifyViaProvider(input: VerificationInput): Promise<VerificationResult | null> {
  const url = process.env.NMC_VERIFY_API_URL
  const key = process.env.NMC_VERIFY_API_KEY
  if (!url || !key) return null

  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        registration_number: input.registrationNumber,
        name: input.name || undefined,
        council: input.medicalCouncil || undefined,
        year: input.registrationYear || undefined,
      }),
    })
    if (!res.ok) return { outcome: 'INCONCLUSIVE', source: 'provider', detail: `provider HTTP ${res.status}` }

    const data: any = await res.json()
    // Providers vary; treat an explicit success/verified flag as a match.
    const verified = data?.verified ?? data?.success ?? data?.data?.verified
    if (verified === true) {
      return {
        outcome: 'MATCHED',
        source: 'provider',
        matchedName: data?.data?.name || data?.name,
        matchedCouncil: data?.data?.council || data?.council,
        matchedYear: String(data?.data?.year || data?.year || ''),
      }
    }
    if (verified === false) return { outcome: 'NOT_FOUND', source: 'provider' }
    return { outcome: 'INCONCLUSIVE', source: 'provider', detail: 'unrecognised provider response' }
  } catch (err: any) {
    return { outcome: 'INCONCLUSIVE', source: 'provider', detail: err?.message || 'provider error' }
  }
}

// Loose agreement between two free-text values (each side empty = treat as agreeing).
function looselyAgrees(a: string, b: string): boolean {
  if (!a || !b) return true
  return a.includes(b) || b.includes(a)
}

// --- Public NMC IMR lookup (the same call the official IMR search page makes) ---
async function verifyViaNmcPublic(input: VerificationInput): Promise<VerificationResult> {
  try {
    const { status, json } = await nmcPostJson(
      NMC_PUBLIC_URL,
      JSON.stringify({ registrationNo: input.registrationNumber.trim() }),
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // The endpoint rejects/empties some requests without a browser-like UA.
        'User-Agent': 'Mozilla/5.0 (compatible; HealthAI-DoctorVerify/1.0)',
      }
    )

    if (status < 200 || status >= 300) {
      return { outcome: 'INCONCLUSIVE', source: 'nmc-public', detail: `NMC HTTP ${status}` }
    }

    const rows: any[] = json
    if (!Array.isArray(rows)) {
      return { outcome: 'INCONCLUSIVE', source: 'nmc-public', detail: 'unexpected NMC response' }
    }
    if (rows.length === 0) {
      // Endpoint answered with no record for this registration number.
      return { outcome: 'NOT_FOUND', source: 'nmc-public' }
    }

    const targetReg = normReg(input.registrationNumber)
    const targetName = normalize(input.name || '')
    const targetCouncil = normalize(input.medicalCouncil || '')
    const targetYear = input.registrationYear ? String(input.registrationYear) : ''

    // Rows whose registration number matches the one provided.
    const regMatches = rows.filter(r => normReg(r.registrationNo || '') === targetReg)
    if (regMatches.length === 0) {
      return { outcome: 'NOT_FOUND', source: 'nmc-public', detail: 'registration number not found' }
    }

    for (const row of regMatches) {
      const rowName = normalize(
        [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ')
      )
      const rowCouncil = normalize(row.smcName || '')
      const rowYear = String(row.yearInfo || row.yearOfRegistration || '')

      const councilAgrees = looselyAgrees(targetCouncil, rowCouncil)
      const nameAgrees = looselyAgrees(targetName, rowName)
      const yearAgrees = !targetYear || !rowYear || targetYear === rowYear

      // Reg number alone isn't enough (not unique across councils): require the
      // council and name to also agree, and the year not to contradict.
      if (councilAgrees && nameAgrees && yearAgrees && (targetCouncil || targetName)) {
        return {
          outcome: 'MATCHED',
          source: 'nmc-public',
          matchedName: rowName || undefined,
          matchedCouncil: row.smcName || undefined,
          matchedYear: rowYear || undefined,
        }
      }
    }

    // The number exists but council/name/year didn't line up with this account —
    // likely a different council's registrant. Flag for review rather than verify.
    return { outcome: 'NOT_FOUND', source: 'nmc-public', detail: 'registration number found but details did not match' }
  } catch (err: any) {
    return { outcome: 'INCONCLUSIVE', source: 'nmc-public', detail: err?.message || 'NMC lookup error' }
  }
}

export async function verifyDoctorRegistration(input: VerificationInput): Promise<VerificationResult> {
  if (!input.registrationNumber || input.registrationNumber.trim().length < 3) {
    return { outcome: 'NOT_FOUND', source: 'none', detail: 'missing registration number' }
  }

  const viaProvider = await verifyViaProvider(input)
  if (viaProvider && viaProvider.outcome !== 'INCONCLUSIVE') return viaProvider

  return verifyViaNmcPublic(input)
}
