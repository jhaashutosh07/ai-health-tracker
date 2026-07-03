import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Users, Plus, Trash2, Heart, Droplet, AlertTriangle, Pill, X } from 'lucide-react'
import AppShell from '@/components/AppShell'

interface Dependent {
  id: string; name: string; relation: string; dob: string; bloodType: string
  allergies: string; conditions: string; medications: string
}

const RELATIONS = ['Child', 'Parent', 'Spouse', 'Sibling', 'Grandparent', 'Other']
const BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function ageFrom(dob: string) {
  if (!dob) return ''
  const d = new Date(dob), n = new Date()
  let y = n.getFullYear() - d.getFullYear()
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) y--
  return y >= 0 ? `${y} yrs` : ''
}

export default function Family() {
  const { status } = useSession()
  const router = useRouter()
  const [list, setList] = useState<Dependent[]>([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState<Dependent>({ id: '', name: '', relation: 'Child', dob: '', bloodType: '', allergies: '', conditions: '', medications: '' })

  useEffect(() => { if (status === 'unauthenticated') router.push('/api/auth/signin') }, [status, router])
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem('healthai_family') || '[]')) } catch {} }, [])

  const save = (next: Dependent[]) => { setList(next); localStorage.setItem('healthai_family', JSON.stringify(next)) }
  const add = () => {
    if (!form.name.trim()) return
    save([...list, { ...form, id: Date.now().toString() }])
    setForm({ id: '', name: '', relation: 'Child', dob: '', bloodType: '', allergies: '', conditions: '', medications: '' })
    setShow(false)
  }
  const remove = (id: string) => save(list.filter(d => d.id !== id))

  if (status === 'loading') return null

  return (
    <AppShell title="Family" breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Family Health' }]}>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Users size={22} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Family & Caregiver Mode</h1>
              <p className="text-slate-500 text-sm mt-1">Keep key health info for the people you care for — handy in emergencies and doctor visits.</p>
            </div>
          </div>
          <button onClick={() => setShow(true)} className="btn btn-primary gap-2"><Plus size={15} /> Add member</button>
        </div>

        {list.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">No family members added yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map(d => (
              <div key={d.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.relation}{ageFrom(d.dob) ? ` · ${ageFrom(d.dob)}` : ''}</p>
                  </div>
                  <button onClick={() => remove(d.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
                <div className="space-y-1.5 text-xs">
                  {d.bloodType && <p className="flex items-center gap-1.5 text-slate-600"><Droplet size={12} className="text-red-500" /> Blood: <span className="font-semibold">{d.bloodType}</span></p>}
                  {d.allergies && <p className="flex items-start gap-1.5 text-slate-600"><AlertTriangle size={12} className="text-amber-500 mt-0.5" /> Allergies: {d.allergies}</p>}
                  {d.conditions && <p className="flex items-start gap-1.5 text-slate-600"><Heart size={12} className="text-rose-500 mt-0.5" /> Conditions: {d.conditions}</p>}
                  {d.medications && <p className="flex items-start gap-1.5 text-slate-600"><Pill size={12} className="text-violet-500 mt-0.5" /> Meds: {d.medications}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-slate-900">Add family member</h2><button onClick={() => setShow(false)}><X size={18} className="text-slate-400" /></button></div>
            <div className="space-y-3">
              <input className="input text-sm" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input text-sm" value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })}>{RELATIONS.map(r => <option key={r}>{r}</option>)}</select>
                <select className="input text-sm" value={form.bloodType} onChange={e => setForm({ ...form, bloodType: e.target.value })}>{BLOOD.map(b => <option key={b} value={b}>{b || 'Blood type'}</option>)}</select>
              </div>
              <div><label className="block text-xs text-slate-500 mb-1">Date of birth</label><input type="date" className="input text-sm" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></div>
              <input className="input text-sm" placeholder="Allergies (comma separated)" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} />
              <input className="input text-sm" placeholder="Conditions" value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })} />
              <input className="input text-sm" placeholder="Current medications" value={form.medications} onChange={e => setForm({ ...form, medications: e.target.value })} />
              <button onClick={add} disabled={!form.name.trim()} className="btn btn-primary w-full justify-center disabled:opacity-50">Save member</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
