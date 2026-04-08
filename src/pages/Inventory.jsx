import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'available' | 'out'

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('items')
        .select('*')
        .order('name')
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'available') return item.available_quantity > 0
    if (filter === 'out') return item.available_quantity < item.total_quantity
    return true
  })

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Inventory</h1>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="input pl-9"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'available', 'out'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse h-16 bg-slate-800/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          {search ? 'No items match your search.' : 'No items yet. Scan something!'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const checkedOut = item.total_quantity - item.available_quantity
            const pct = item.total_quantity > 0 ? (item.available_quantity / item.total_quantity) : 1
            return (
              <Link key={item.id} to={`/item/${item.id}`} className="card flex items-center gap-3 hover:bg-slate-700 active:bg-slate-600 transition-colors block">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">
                    <span className={item.available_quantity > 0 ? 'text-green-400' : 'text-red-400'}>
                      {item.available_quantity}
                    </span>
                    <span className="text-slate-500"> / {item.total_quantity}</span>
                  </p>
                  <p className="text-xs text-slate-500">available</p>
                </div>
                {/* Bar */}
                <div className="w-1 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
                  <div
                    className={`w-full rounded-full transition-all ${pct > 0.5 ? 'bg-green-400' : pct > 0 ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ height: `${pct * 100}%`, marginTop: `${(1 - pct) * 100}%` }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
