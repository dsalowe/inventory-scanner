import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function StatCard({ label, value, color }) {
  return (
    <div className="card flex-1 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, checkedOut: 0, items: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: items }, { data: txns }] = await Promise.all([
        supabase.from('items').select('id, available_quantity, total_quantity'),
        supabase.from('transactions').select('id, type, quantity, borrower_name, checked_out_at, checked_in_at, item_id, items(name, sku)').order('checked_out_at', { ascending: false }).limit(10)
      ])

      const checkedOut = (items || []).reduce((sum, i) => sum + (i.total_quantity - i.available_quantity), 0)
      setStats({ total: (items || []).reduce((s, i) => s + i.total_quantity, 0), checkedOut, items: (items || []).length })
      setRecent(txns || [])
      setLoading(false)
    }
    load()
  }, [])

  const email = user?.email?.split('@')[0] || 'there'

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Hey, {email} 👋</h1>
        <p className="text-slate-400 text-sm">Here's your inventory overview</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <StatCard label="Items" value={stats.items} color="text-slate-100" />
        <StatCard label="Total Units" value={stats.total} color="text-blue-400" />
        <StatCard label="Checked Out" value={stats.checkedOut} color="text-red-400" />
      </div>

      {/* Big scan button */}
      <Link to="/scan" className="block mb-6">
        <div className="card bg-green-500/10 border-green-500/40 hover:bg-green-500/20 active:bg-green-500/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 8h-.01M5 8v-.01M5 8H3m2-4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white text-lg">Scan Item</p>
              <p className="text-slate-400 text-sm">Check in or check out using camera</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      {/* Recent activity */}
      <div>
        <h2 className="font-semibold text-slate-300 mb-3">Recent Activity</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse h-16 bg-slate-800/50" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="card text-center py-8 text-slate-500">
            <p>No activity yet. Scan your first item!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(tx => (
              <Link key={tx.id} to={`/item/${tx.item_id}`} className="card flex items-center gap-3 hover:bg-slate-700 active:bg-slate-600 transition-colors block">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'checkout' ? 'bg-red-400' : 'bg-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">{tx.items?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{tx.items?.sku} · {tx.borrower_name || 'N/A'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={tx.type === 'checkout' ? 'badge-out' : 'badge-in'}>
                    {tx.type === 'checkout' ? 'Out' : 'In'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(tx.checked_out_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
