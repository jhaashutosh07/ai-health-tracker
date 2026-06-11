import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, Phone, Heart, Stethoscope, ShieldAlert } from 'lucide-react'

interface EmergencyCardProps {
  name: string
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
      </Head>

      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="bg-red-600 text-white rounded-t-2xl p-5 flex items-center gap-3">
            <ShieldAlert size={32} />
            <div>
              <h1 className="text-2xl font-bold">Emergency Medical Card</h1>
              <p className="text-red-100 text-sm">Show this to first responders</p>
            </div>
          </div>

          {/* Card body */}
          <div className="bg-white rounded-b-2xl shadow-2xl p-6 space-y-5">
            {/* Patient name */}
            <div className="text-center border-b pb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Patient</p>
              <h2 className="text-3xl font-bold text-gray-900">{name || 'Unknown'}</h2>
            </div>

            {/* Blood type */}
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Blood Type</p>
                <p className="text-3xl font-bold text-red-700">{bloodType || 'Unknown'}</p>
              </div>
            </div>

            {/* Allergies */}
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-orange-600" />
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wider">Allergies</p>
              </div>
              {allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a, i) => (
                    <span key={i} className="bg-orange-100 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-sm font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No known allergies</p>
              )}
            </div>

            {/* Emergency Contact */}
            {(emergencyContactName || emergencyContactPhone) && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={18} className="text-blue-600" />
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Emergency Contact</p>
                </div>
                {emergencyContactName && (
                  <p className="font-semibold text-gray-800">{emergencyContactName}</p>
                )}
                {emergencyContactPhone && (
                  <a
                    href={`tel:${emergencyContactPhone}`}
                    className="text-blue-600 text-lg font-bold hover:underline"
                  >
                    {emergencyContactPhone}
                  </a>
                )}
              </div>
            )}

            {/* Medical disclaimer */}
            <div className="flex items-start gap-2 text-xs text-gray-400 border-t pt-4">
              <Stethoscope size={14} className="flex-shrink-0 mt-0.5" />
              <p>This card is patient-provided. Verify information with medical records when possible.</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2 border-t pt-4">
              <p className="text-xs text-gray-400">Scan to view this card</p>
              <QRCodeSVG value={cardUrl} size={120} />
            </div>
          </div>

          {/* Setup prompt (only shown if info is incomplete) */}
          {!bloodType && allergies.length === 0 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Complete your emergency info in your dashboard settings.
            </p>
          )}
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

    if (!res.ok) {
      return { notFound: true }
    }

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
