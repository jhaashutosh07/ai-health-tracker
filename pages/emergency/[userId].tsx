import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, Phone, Heart, Stethoscope, ShieldAlert } from 'lucide-react'

interface EmergencyCardProps {
  name: string | null
  bloodType: string | null
  allergies: string[]
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  cardUrl: string
}

export default function EmergencyCard({
  name,
  bloodType,
  allergies,
  emergencyContactName,
  emergencyContactPhone,
  cardUrl,
}: EmergencyCardProps) {
  return (
    <>
      <Head>
        <title>Emergency Medical Card — {name || 'Patient'}</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">

            {/* Top stripe */}
            <div className="h-2 bg-red-500" />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                  <ShieldAlert size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Emergency</p>
                  <p className="text-sm font-semibold text-slate-800">Medical Card</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-red-600">LIVE</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Patient name */}
              <div className="text-center py-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Patient</p>
                <h1 className="text-2xl font-extrabold text-slate-900">{name || 'Unknown Patient'}</h1>
              </div>

              {/* Blood type */}
              <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-red-400 uppercase tracking-widest font-semibold">Blood Type</p>
                  <p className="text-3xl font-black text-red-600">{bloodType || '—'}</p>
                </div>
              </div>

              {/* Allergies */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Allergies</p>
                </div>
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a, i) => (
                      <span key={i} className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600">No known allergies</p>
                )}
              </div>

              {/* Emergency contact */}
              {(emergencyContactName || emergencyContactPhone) && (
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone size={14} className="text-sky-600" />
                    <p className="text-[10px] font-bold text-sky-700 uppercase tracking-widest">Emergency Contact</p>
                  </div>
                  {emergencyContactName && (
                    <p className="text-sm font-semibold text-slate-800 mb-1">{emergencyContactName}</p>
                  )}
                  {emergencyContactPhone && (
                    <a
                      href={`tel:${emergencyContactPhone}`}
                      className="text-xl font-black text-sky-600 hover:underline block"
                    >
                      {emergencyContactPhone}
                    </a>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                <Stethoscope size={12} className="text-slate-300 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Patient-provided information. Verify with medical records when possible.
                </p>
              </div>

              {/* QR code */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Scan to view this card</p>
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <QRCodeSVG value={cardUrl} size={100} />
                </div>
              </div>
            </div>

            {/* Bottom stripe */}
            <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-600" />
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 mt-4">
            Powered by HealthAI · Set up your card at healthai.app/settings
          </p>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { userId } = context.params as { userId: string }
  const proto = context.req.headers['x-forwarded-proto'] || 'http'
  const host = context.req.headers.host
  const cardUrl = `${proto}://${host}/emergency/${userId}`

  try {
    const baseUrl = process.env.NEXTAUTH_URL || `${proto}://${host}`
    const res = await fetch(`${baseUrl}/api/profile/emergency-info?userId=${userId}`)
    if (!res.ok) return { notFound: true }

    const data = await res.json()

    return {
      props: {
        name: data.name || null,
        bloodType: data.bloodType || null,
        allergies: data.allergies || [],
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        cardUrl,
      },
    }
  } catch {
    return { notFound: true }
  }
}
