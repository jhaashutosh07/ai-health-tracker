import { useState, useEffect } from 'react'
import { Play, X, Film } from 'lucide-react'

// Configure the demo video via env (a YouTube / Loom / Vimeo link, or a direct
// .mp4/.webm URL), or just drop the file at /public/demo.mp4.
const RAW = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || '/demo.mp4'

function toEmbed(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0&modestbranding=1`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
  const lm = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/)
  if (lm) return `https://www.loom.com/embed/${lm[1]}?autoplay=1`
  return null
}

export default function WatchDemo({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const embed = toEmbed(RAW)

  return (
    <>
      <button
        onClick={() => { setFailed(false); setOpen(true) }}
        className={className || 'btn glass text-white gap-2 hover:bg-white/20'}
      >
        <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
          <Play size={11} className="text-white ml-0.5" fill="currentColor" />
          <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
        </span>
        Watch demo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {embed && !failed ? (
              <iframe src={embed} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            ) : !failed ? (
              <video src={RAW} controls autoPlay playsInline className="w-full h-full object-contain bg-black" onError={() => setFailed(true)} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-white/80 gap-3 px-6"
                style={{ backgroundImage: 'linear-gradient(135deg,#0b1220,#1e1b4b 60%,#0e7490)' }}>
                <Film size={40} className="text-white/60" />
                <p className="font-semibold text-white">Demo video not set yet</p>
                <p className="text-xs text-white/60 max-w-sm">
                  Add a video by setting <code className="bg-white/10 px-1.5 py-0.5 rounded">NEXT_PUBLIC_DEMO_VIDEO_URL</code> to a
                  YouTube / Loom / Vimeo link, or dropping your screen recording at <code className="bg-white/10 px-1.5 py-0.5 rounded">/public/demo.mp4</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
