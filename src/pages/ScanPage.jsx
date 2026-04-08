import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import NewItemModal from '../components/NewItemModal'
import CheckoutModal from '../components/CheckoutModal'

export default function ScanPage() {
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const [scanning, setScanning] = useState(true)
  const [status, setStatus] = useState('Point camera at a barcode or QR code')
  const [error, setError] = useState('')
  const [manualSku, setManualSku] = useState('')
  const [showManual, setShowManual] = useState(false)

  // Modals
  const [newItemModal, setNewItemModal] = useState(null) // { sku }
  const [checkoutModal, setCheckoutModal] = useState(null) // { item }

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode('qr-reader')
    scannerRef.current = html5Qrcode

    html5Qrcode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 200 } },
      (decodedText) => {
        if (!scanning) return
        setScanning(false)
        handleScan(decodedText)
      },
      () => {} // ignore per-frame errors
    ).catch(err => {
      setError('Camera access denied. Use manual entry below.')
      console.error(err)
    })

    return () => {
      html5Qrcode.stop().catch(() => {})
    }
  }, [])

  async function handleScan(sku) {
    setStatus(`Looking up SKU: ${sku}…`)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('sku', sku.trim())
      .single()

    if (error || !data) {
      setNewItemModal({ sku: sku.trim() })
    } else {
      setCheckoutModal({ item: data })
    }
  }

  function resumeScanning() {
    setScanning(true)
    setStatus('Point camera at a barcode or QR code')
    setNewItemModal(null)
    setCheckoutModal(null)
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualSku.trim()) return
    setShowManual(false)
    setScanning(false)
    await handleScan(manualSku.trim())
    setManualSku('')
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-800">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Scan Item</h1>
      </div>

      {/* Camera */}
      <div className="relative mb-4">
        <div id="qr-reader" className="w-full rounded-2xl overflow-hidden bg-slate-900 min-h-[260px]" />
        {/* Overlay crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-green-400/60 rounded-xl w-64 h-48" style={{ boxShadow: '0 0 0 9999px rgba(15,23,42,0.5)' }} />
        </div>
      </div>

      {error ? (
        <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 mb-4">{error}</p>
      ) : (
        <p className="text-slate-400 text-sm text-center mb-4">{status}</p>
      )}

      {/* Manual entry toggle */}
      {!showManual ? (
        <button onClick={() => setShowManual(true)} className="btn-secondary w-full text-sm">
          Enter SKU manually
        </button>
      ) : (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Enter SKU…"
            value={manualSku}
            onChange={e => setManualSku(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary px-4">Go</button>
          <button type="button" onClick={() => setShowManual(false)} className="btn-secondary px-4">✕</button>
        </form>
      )}

      {/* Modals */}
      {newItemModal && (
        <NewItemModal
          sku={newItemModal.sku}
          onClose={resumeScanning}
          onCreated={(item) => {
            setNewItemModal(null)
            setCheckoutModal({ item })
          }}
        />
      )}
      {checkoutModal && (
        <CheckoutModal
          item={checkoutModal.item}
          onClose={resumeScanning}
          onDone={() => navigate(`/item/${checkoutModal.item.id}`)}
        />
      )}
    </div>
  )
}
