'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm fade-in" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-6 fade-up">
        <button onClick={onCancel} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
          <X size={16} />
        </button>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-50' : 'bg-sky-50'}`}>
          <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-sky-500'} />
        </div>
        <h3 className="font-bold text-slate-900 text-base">{title}</h3>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{message}</p>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onCancel} className="btn btn-outline flex-1">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
