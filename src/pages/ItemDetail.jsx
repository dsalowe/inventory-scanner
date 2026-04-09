import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CheckoutModal from '../components/CheckoutModal'
import CheckinModal from '../components/CheckinModal'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutModal, setCheckoutModal] = useState(false)
  const [checkinModal, setCheckinModal] = useState(null) // transaction
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('transactions').delete().eq('item_id', id)
    await supabase.from('items').delete().eq('id', id)
    navigate('/inventory', { replace: true })
  }

  async function load() {
    const [{ data: itemData }, { data: txData }] = await Promise.all([
      supabase.from('items').select('*').eq('id', id).single(),
      supabase.from('transactions').select('*').eq('item_id', id).order('checked_out_at', { ascending: false })
    ])
    setItem(itemData)
    setTransactions(txData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const activeCheckouts = transactions.filter(t => t.type === 'checkout' && !t.checked_in_at)

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!item) return (
    <div className="px-4 pt-6 text-center text-slate-400">Item not found.</div>
  )

  const checkedOut = item.total_quantity - item.available_quantity

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-800 mt-0.5">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{item.name}</h1>
          <p className="text-slate-400 text-sm font-mono">SKU: {item.sku}</p>
        </div>
      </div>

      {/* Item info card */}
      <div className="card mb-4">
        <div className="flex justify-between mb-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{item.total_quantity}</p>
            <p className="text-slate-400 text-xs">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-300">{item.available_quantity}</p>
            <p className="text-slate-400 text-xs">Available</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{checkedOut}</p>
            <p className="text-slate-400 text-xs">Checked Out</p>
          </div>
        </div>
        {item.description && <p className="text-slate-400 text-sm border-t border-slate-700 pt-3">{item.description}</p>}
        {item.notes && <p className="text-slate-500 text-xs mt-2 italic">{item.notes}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setCheckoutModal(true)}
          className="btn-primary flex-1"
          disabled={item.available_quantity === 0}
        >
          Check Out
        </button>
        <button
          onClick={() => setCheckinModal(activeCheckouts[0] || null)}
          className="btn-secondary flex-1"
          disabled={activeCheckouts.length === 0}
        >
          Check In {activeCheckouts.length > 0 && `(${activeCheckouts.length})`}
        </button>
      </div>

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-400 hover:text-red-300 text-sm mb-6 block"
        >
          Delete this item
        </button>
      ) : (
        <div className="card border-red-900/50 bg-red-900/10 mb-6">
          <p className="text-sm text-red-300 mb-3">
            Are you sure? This will permanently delete <strong>{item.name}</strong> and all its transaction history.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
            <button onClick={handleDelete} className="btn-danger flex-1 text-sm py-2" disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Active checkouts */}
      {activeCheckouts.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-300 mb-2">Currently Out</h2>
          <div className="space-y-2">
            {activeCheckouts.map(tx => (
              <div key={tx.id} className="card border-red-900/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{tx.borrower_name || 'Unknown'}</p>
                    {tx.borrower_contact && <p className="text-slate-400 text-sm">{tx.borrower_contact}</p>}
                    <p className="text-slate-500 text-xs mt-1">
                      Qty: {tx.quantity} · Out: {formatDate(tx.checked_out_at)}
                      {tx.due_date && <> · Due: <span className={new Date(tx.due_date) < new Date() ? 'text-red-400' : ''}>{formatDate(tx.due_date)}</span></>}
                    </p>
                    {tx.notes && <p className="text-slate-500 text-xs italic mt-1">"{tx.notes}"</p>}
                  </div>
                  <button
                    onClick={() => setCheckinModal(tx)}
                    className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
                  >
                    Check In
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full history */}
      <div>
        <h2 className="font-semibold text-slate-300 mb-2">History</h2>
        {transactions.length === 0 ? (
          <p className="text-slate-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="card">
                <div className="flex items-center gap-3">
                  <span className={tx.type === 'checkout' ? 'badge-out' : 'badge-in'}>
                    {tx.type === 'checkout' ? 'Out' : 'In'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{tx.borrower_name || '—'}</p>
                    {tx.borrower_contact && <p className="text-xs text-slate-500">{tx.borrower_contact}</p>}
                    {tx.notes && <p className="text-xs text-slate-500 italic">"{tx.notes}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Qty: {tx.quantity}</p>
                    <p className="text-xs text-slate-500">{formatDate(tx.checked_out_at)}</p>
                    {tx.checked_in_at && <p className="text-xs text-purple-400">↩ {formatDate(tx.checked_in_at)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {checkoutModal && (
        <CheckoutModal
          item={item}
          onClose={() => setCheckoutModal(false)}
          onDone={() => { setCheckoutModal(false); load() }}
        />
      )}
      {checkinModal && (
        <CheckinModal
          item={item}
          transaction={checkinModal}
          allActive={activeCheckouts}
          onClose={() => setCheckinModal(null)}
          onDone={() => { setCheckinModal(null); load() }}
        />
      )}
    </div>
  )
}
