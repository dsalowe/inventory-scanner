import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import NewItemModal from '../components/NewItemModal'
import NewStudentModal from '../components/NewStudentModal'

export default function ScanPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const scannerRef = useRef(null)
  const processingRef = useRef(false)

  // Session state
  const [student, setStudent] = useState(null) // active student for this session
  const [phase, setPhase] = useState('student') // 'student' | 'items'
  const [status, setStatus] = useState('Scan a student ID to begin')
  const [error, setError] = useState('')
  const [scannedItems, setScannedItems] = useState([]) // items checked out this session
  const [showManual, setShowManual] = useState(false)
  const [manualCode, setManualCode] = useState('')

  // Modals
  const [newStudentModal, setNewStudentModal] = useState(null)
  const [newItemModal, setNewItemModal] = useState(null)

  // Toast notifications
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Scanner setup
  useEffect(() => {
    const html5Qrcode = new Html5Qrcode('qr-reader')
    scannerRef.current = html5Qrcode

    html5Qrcode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 200 } },
      (decodedText) => {
        if (processingRef.current) return
        processingRef.current = true
        handleScan(decodedText)
      },
      () => {}
    ).catch(err => {
      setError('Camera access denied. Use manual entry below.')
      console.error(err)
    })

    return () => {
      html5Qrcode.stop().catch(() => {})
    }
  }, [])

  async function handleScan(code) {
    const trimmed = code.trim()
    if (phase === 'student' && !student) {
      await lookupStudent(trimmed)
    } else {
      await lookupItem(trimmed)
    }
    // Small delay before allowing next scan
    setTimeout(() => { processingRef.current = false }, 1500)
  }

  // ── Student lookup ──
  async function lookupStudent(code) {
    setStatus(`Looking up student: ${code}…`)
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_code', code)
      .single()

    if (error || !data) {
      setNewStudentModal({ studentCode: code })
    } else {
      startSession(data)
    }
  }

  function startSession(studentData) {
    setStudent(studentData)
    setPhase('items')
    setScannedItems([])
    setStatus(`Scanning items for ${studentData.name}`)
    setNewStudentModal(null)
    showToast(`Session started for ${studentData.name}`)
  }

  // ── Item lookup & auto-checkout ──
  async function lookupItem(sku) {
    setStatus(`Looking up: ${sku}…`)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('sku', sku)
      .single()

    if (error || !data) {
      setNewItemModal({ sku })
    } else {
      await checkoutItem(data)
    }
  }

  async function checkoutItem(item) {
    if (item.available_quantity <= 0) {
      showToast(`${item.name} — none available!`, 'error')
      setStatus(`Scanning items for ${student.name}`)
      return
    }

    // Auto-checkout to current student
    const { error: txErr } = await supabase.from('transactions').insert({
      item_id: item.id,
      type: 'checkout',
      quantity: 1,
      borrower_name: student.name,
      borrower_contact: student.contact || null,
      notes: `Student: ${student.student_code}`,
      created_by: user?.id
    })
    if (txErr) {
      showToast(`Error: ${txErr.message}`, 'error')
      return
    }

    const { error: itemErr } = await supabase
      .from('items')
      .update({ available_quantity: item.available_quantity - 1 })
      .eq('id', item.id)
    if (itemErr) {
      showToast(`Error: ${itemErr.message}`, 'error')
      return
    }

    setScannedItems(prev => [...prev, { ...item, scannedAt: new Date() }])
    showToast(`✓ ${item.name} checked out`)
    setStatus(`Scanning items for ${student.name}`)
  }

  // ── End session ──
  function endSession() {
    setStudent(null)
    setPhase('student')
    setScannedItems([])
    setStatus('Scan a student ID to begin')
    processingRef.current = false
  }

  // ── Manual entry ──
  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualCode.trim()) return
    setShowManual(false)
    processingRef.current = true
    await handleScan(manualCode.trim())
    setManualCode('')
    setTimeout(() => { processingRef.current = false }, 1500)
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-800">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">
          {phase === 'student' ? 'Scan Student ID' : 'Scan Items'}
        </h1>
      </div>

      {/* Active student banner */}
      {student && (
        <div className="card bg-blue-500/10 border-blue-500/40 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">{student.name}</p>
                <p className="text-xs text-slate-400">
                  Code: {student.student_code}
                  {scannedItems.length > 0 && ` · ${scannedItems.length} item${scannedItems.length > 1 ? 's' : ''} scanned`}
                </p>
              </div>
            </div>
            <button onClick={endSession} className="btn-danger text-xs py-1.5 px-3">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Camera */}
      <div className="relative mb-4">
        <div id="qr-reader" className="w-full rounded-2xl overflow-hidden bg-slate-900 min-h-[260px]" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`border-2 rounded-xl w-64 h-48 ${phase === 'student' ? 'border-blue-400/60' : 'border-purple-300/60'}`}
            style={{ boxShadow: '0 0 0 9999px rgba(15,23,42,0.5)' }}
          />
        </div>
        {/* Phase indicator */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${
          phase === 'student'
            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
            : 'bg-purple-400/30 text-purple-200 border border-purple-400/50'
        }`}>
          {phase === 'student' ? '👤 Student' : '📦 Item'}
        </div>
      </div>

      {error ? (
        <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 mb-4">{error}</p>
      ) : (
        <p className="text-slate-400 text-sm text-center mb-4">{status}</p>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto px-4 py-3 rounded-xl text-sm font-medium text-center transition-all ${
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-purple-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Manual entry */}
      {!showManual ? (
        <button onClick={() => setShowManual(true)} className="btn-secondary w-full text-sm">
          Enter {phase === 'student' ? 'student code' : 'SKU'} manually
        </button>
      ) : (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder={phase === 'student' ? 'Student code…' : 'Item SKU…'}
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary px-4">Go</button>
          <button type="button" onClick={() => setShowManual(false)} className="btn-secondary px-4">✕</button>
        </form>
      )}

      {/* Scanned items list */}
      {scannedItems.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-slate-300 mb-2">
            Checked out this session ({scannedItems.length})
          </h2>
          <div className="space-y-2">
            {scannedItems.map((item, i) => (
              <div key={`${item.id}-${i}`} className="card py-3 flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-300 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.sku}</p>
                </div>
                <span className="badge-out text-xs">Out</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {newStudentModal && (
        <NewStudentModal
          studentCode={newStudentModal.studentCode}
          onClose={() => { setNewStudentModal(null); processingRef.current = false }}
          onCreated={(s) => startSession(s)}
        />
      )}
      {newItemModal && (
        <NewItemModal
          sku={newItemModal.sku}
          onClose={() => { setNewItemModal(null); processingRef.current = false; setStatus(`Scanning items for ${student?.name || ''}`) }}
          onCreated={(item) => {
            setNewItemModal(null)
            checkoutItem(item)
          }}
        />
      )}
    </div>
  )
}
