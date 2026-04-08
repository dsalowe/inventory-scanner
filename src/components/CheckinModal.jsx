import { useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CheckinModal({ item, transaction, allActive, onClose, onDone }) {
  const [selected, setSelected] = useState(transaction?.id || '')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tx = allActive.find(t => t.id === selected) || transaction

  async function handleSubmit(e) {
    e.preventDefault()
    if (!tx) return
    setLoading(true)
    setError('')

    const { error: txErr } = await supabase
      .from('transactions')
      .update({ checked_in_at: new Date().toISOString(), notes: notes || tx.notes })
      .eq('id', tx.id)
    if (txErr) { setError(txErr.message); setLoading(false); return }

    // Restore available quantity
    const { error: itemErr } = await supabase
      .from('items')
      .update({ available_quantity: item.available_quantity + tx.quantity })
      .eq('id', item.id)
    if (itemErr) { setError(itemErr.message); setLoading(false); return }

    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-white">Check In</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-slate-400 text-sm mb-4">{item.name} · <span className="font-mono">{item.sku}</span></p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Select which checkout to check in */}
            {allActive.length > 1 && (
              <div>
                <label className="label">Select Checkout</label>
                <div className="space-y-2">
                  {allActive.map(t => (
                    <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected === t.id ? 'border-green-500 bg-green-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                      <input type="radio" name="tx" value={t.id} checked={selected === t.id} onChange={() => setSelected(t.id)} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">{t.borrower_name}</p>
                        {t.borrower_contact && <p className="text-xs text-slate-400">{t.borrower_contact}</p>}
                        <p className="text-xs text-slate-500">Qty: {t.quantity} · Out since {formatDate(t.checked_out_at)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Show selected checkout summary */}
            {tx && allActive.length === 1 && (
              <div className="bg-slate-900 rounded-xl p-3">
                <p className="text-sm font-medium text-white">{tx.borrower_name}</p>
                {tx.borrower_contact && <p className="text-xs text-slate-400">{tx.borrower_contact}</p>}
                <p className="text-xs text-slate-500 mt-1">Qty: {tx.quantity} · Out since {formatDate(tx.checked_out_at)}</p>
              </div>
            )}

            <div>
              <label className="label">Return Notes</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Any notes on return condition…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={loading || !tx}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : 'Confirm Return'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
