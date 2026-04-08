import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const tabs = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    )
  },
  {
    to: '/scan',
    label: 'Scan',
    scan: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 8h-.01M5 8v-.01M5 8H3m2-4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    )
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    )
  }
]

export default function Navbar() {
  const location = useLocation()
  const { signOut } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-40 safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
        {tabs.map(tab => {
          const active = location.pathname === tab.to
          if (tab.scan) return (
            <Link key={tab.to} to={tab.to} className="flex flex-col items-center">
              <div className={`w-14 h-14 -mt-6 rounded-full flex items-center justify-center border-4 border-slate-950 transition-all ${active ? 'bg-green-400' : 'bg-green-500 hover:bg-green-400'}`}>
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {tab.icon}
                </svg>
              </div>
              <span className="text-xs text-slate-500 mt-1">{tab.label}</span>
            </Link>
          )
          return (
            <Link key={tab.to} to={tab.to} className="flex flex-col items-center py-1 px-3">
              <svg className={`w-6 h-6 transition-colors ${active ? 'text-green-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {tab.icon}
              </svg>
              <span className={`text-xs mt-0.5 transition-colors ${active ? 'text-green-400' : 'text-slate-500'}`}>{tab.label}</span>
            </Link>
          )
        })}
        <button onClick={signOut} className="flex flex-col items-center py-1 px-3">
          <svg className="w-6 h-6 text-slate-500 hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-xs text-slate-500 mt-0.5">Sign Out</span>
        </button>
      </div>
    </nav>
  )
}
