import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function NewStudentModal({ studentCode, onClose, onCreated }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    student_code: studentCode || '',
    name: '',
    contact: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Student name is required.')
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('students')
      .insert({
        student_code: form.student_code.trim(),
        name: form.name.trim(),
        contact: form.contact.trim() || null,
        notes: form.notes.trim() || null,
        created_by: user?.id
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onCreated(data)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">New Student</h2>
              <p className="text-sm text-slate-400">Student not found — add them now</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Student Code</label>
              <input className="input font-mono" value={form.student_code} onChange={e => set('student_code', e.target.value)} required />
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="e.g. John Smith" value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Contact (phone or email)</label>
              <input className="input" placeholder="Optional" value={form.contact} onChange={e => set('contact', e.target.value)} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} placeholder="Any notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
