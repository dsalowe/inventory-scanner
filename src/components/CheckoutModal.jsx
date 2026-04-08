import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function CheckoutModal({ item, onClose, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    borrower_name: '',
    borrower_contact: '',
    quantity: 1,
    notes: '',
    due_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(form.quantity)
    if (!form.borrower_name.trim()) return setError('Borrower name is required.')
    if (qty < 1 || qty > item.available_quantity) return setError(`Quantity must be between 1 and ${item.available_quantity}.`)
    setLoading(true)
    setError('')

    // Insert transaction
    const { error: txErr } = await supabase.from('transactions').insert({
      item_id: item.id,
      type: 'checkout',
      quantity: qty,
      borrower_name: form.borrower_name.trim(),
      borrower_contact: form.borrower_contact.trim() || null,
      notes: form.notes.trim() || null,
      due_date: form.due_date || null,
      created_by: user?.id
    })
    if (txErr) { setError(txErr.message); setLoading(false); return }

    // Decrement available quantity
    const { error: itemErr } = await supabase
      .from('items')
      .update({ available_quantity: item.available_quantity - qty })
      .eq('id', item.id)
    if (itemErr) { setError(itemErr.message); setLoading(false); return }

    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-white">Check Out</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-slate-400 text-sm mb-4">{item.name} · <span className="font-mono">{item.sku}</span> · {item.available_quantity} available</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Borrower Name *</label>
              <input className="input" placeholder="Full name" value={form.borrower_name} onChange={e => set('borrower_name', e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Contact (phone or email)</label>
              <input className="input" placeholder="Optional" value={form.borrower_contact} onChange={e => set('borrower_contact', e.target.value)} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" max={item.available_quantity} value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="datetime-local" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
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
                ) : 'Check Out'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
