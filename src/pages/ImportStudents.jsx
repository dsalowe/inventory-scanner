import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Handle quoted fields and commas inside quotes
  function parseLine(line) {
    const fields = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())
  const rows = lines.slice(1).filter(l => l.trim()).map(parseLine)
  return { headers, rows }
}

function detectColumns(headers) {
  const mapping = { student_code: -1, name: -1, contact: -1 }

  headers.forEach((h, i) => {
    const lower = h.toLowerCase()
    // Student code / ID
    if (mapping.student_code === -1 && /(student.*id|id.*number|code|badge|barcode|sis.*id|external.*id)/i.test(lower)) {
      mapping.student_code = i
    }
    // Name (prefer full name, fall back to first/last)
    if (mapping.name === -1 && /(full.*name|^name$|student.*name|display.*name)/i.test(lower)) {
      mapping.name = i
    }
    // Contact / email
    if (mapping.contact === -1 && /(email|contact|phone)/i.test(lower)) {
      mapping.contact = i
    }
  })

  // If no full name found, look for first/last name columns
  if (mapping.name === -1) {
    const firstIdx = headers.findIndex(h => /(first.*name|given.*name)/i.test(h))
    const lastIdx = headers.findIndex(h => /(last.*name|family.*name|surname)/i.test(h))
    if (firstIdx !== -1 || lastIdx !== -1) {
      mapping.name = firstIdx !== -1 ? firstIdx : lastIdx
      mapping._lastName = lastIdx !== -1 && lastIdx !== mapping.name ? lastIdx : -1
    }
  }

  return mapping
}

export default function ImportStudents() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileRef = useRef(null)

  const [step, setStep] = useState('upload') // 'upload' | 'map' | 'preview' | 'done'
  const [csvData, setCsvData] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState({ student_code: -1, name: -1, contact: -1, _lastName: -1 })
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      const parsed = parseCSV(text)
      if (parsed.rows.length === 0) {
        setError('No data rows found in the CSV file.')
        return
      }
      setCsvData(parsed)
      const autoMap = detectColumns(parsed.headers)
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsText(file)
  }

  function handleMap(field, colIdx) {
    setMapping(prev => ({ ...prev, [field]: parseInt(colIdx) }))
  }

  function goToPreview() {
    if (mapping.student_code === -1 || mapping.name === -1) {
      setError('Student Code and Name columns are required.')
      return
    }
    setError('')
    const students = csvData.rows.map(row => {
      let name = row[mapping.name] || ''
      if (mapping._lastName !== -1 && row[mapping._lastName]) {
        name = `${name} ${row[mapping._lastName]}`
      }
      return {
        student_code: row[mapping.student_code]?.trim() || '',
        name: name.trim(),
        contact: mapping.contact !== -1 ? row[mapping.contact]?.trim() || null : null
      }
    }).filter(s => s.student_code && s.name)

    setPreview(students)
    setStep('preview')
  }

  async function doImport() {
    setImporting(true)
    setError('')
    let imported = 0
    let skipped = 0
    const errors = []

    // Insert in batches of 50
    for (let i = 0; i < preview.length; i += 50) {
      const batch = preview.slice(i, i + 50).map(s => ({
        ...s,
        created_by: user?.id
      }))
      const { data, error } = await supabase
        .from('students')
        .upsert(batch, { onConflict: 'student_code', ignoreDuplicates: true })
        .select()

      if (error) {
        errors.push(error.message)
      } else {
        imported += data?.length || 0
      }
    }

    skipped = preview.length - imported
    setResult({ imported, skipped, errors })
    setStep('done')
    setImporting(false)
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-800">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Import Students</h1>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div>
          <div className="card text-center py-10 mb-4">
            <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-slate-300 font-medium mb-1">Upload a CSV file</p>
            <p className="text-slate-500 text-sm mb-4">Export your roster from Google Classroom and upload it here</p>
            <button onClick={() => fileRef.current?.click()} className="btn-primary">
              Choose File
            </button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-2">How to export from Google Classroom:</h3>
            <ol className="text-sm text-slate-400 space-y-1.5 list-decimal list-inside">
              <li>Open your class in Google Classroom</li>
              <li>Click <span className="text-slate-300">People</span></li>
              <li>Click the <span className="text-slate-300">gear icon</span> or <span className="text-slate-300">Actions</span></li>
              <li>Select <span className="text-slate-300">Download as CSV</span></li>
              <li>Upload the file here</li>
            </ol>
          </div>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && csvData && (
        <div>
          <p className="text-slate-400 text-sm mb-4">
            Found <span className="text-white font-medium">{csvData.rows.length} rows</span> and <span className="text-white font-medium">{csvData.headers.length} columns</span>. Match the columns below:
          </p>

          <div className="space-y-4 mb-6">
            {[
              { key: 'student_code', label: 'Student Code / ID *', desc: 'Barcode or student ID number' },
              { key: 'name', label: 'Name *', desc: 'Student full name (or first name)' },
              { key: '_lastName', label: 'Last Name', desc: 'Optional — if name is split across two columns' },
              { key: 'contact', label: 'Contact / Email', desc: 'Optional' }
            ].map(field => (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <p className="text-xs text-slate-500 mb-1">{field.desc}</p>
                <select
                  className="input"
                  value={mapping[field.key]}
                  onChange={e => handleMap(field.key, e.target.value)}
                >
                  <option value={-1}>— Skip —</option>
                  {csvData.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h} {csvData.rows[0]?.[i] ? `(e.g. "${csvData.rows[0][i]}")` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-3 py-2 mb-4">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => { setStep('upload'); setError('') }} className="btn-secondary flex-1">Back</button>
            <button onClick={goToPreview} className="btn-primary flex-1">Preview</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div>
          <p className="text-slate-400 text-sm mb-4">
            Ready to import <span className="text-white font-medium">{preview.length} students</span>. Duplicates (same student code) will be skipped.
          </p>

          <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
            {preview.slice(0, 50).map((s, i) => (
              <div key={i} className="card py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-blue-400 font-medium">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    Code: {s.student_code}
                    {s.contact && ` · ${s.contact}`}
                  </p>
                </div>
              </div>
            ))}
            {preview.length > 50 && (
              <p className="text-center text-slate-500 text-sm py-2">
                …and {preview.length - 50} more
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('map')} className="btn-secondary flex-1">Back</button>
            <button onClick={doImport} className="btn-primary flex-1" disabled={importing}>
              {importing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing…
                </span>
              ) : `Import ${preview.length} Students`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && result && (
        <div className="card text-center py-8">
          <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Import Complete</h2>
          <p className="text-slate-400 text-sm mb-1">
            <span className="text-green-400 font-medium">{result.imported}</span> students imported
          </p>
          {result.skipped > 0 && (
            <p className="text-slate-500 text-xs mb-1">{result.skipped} duplicates skipped</p>
          )}
          {result.errors.length > 0 && (
            <p className="text-red-400 text-xs">{result.errors.join(', ')}</p>
          )}
          <div className="flex gap-3 mt-6 max-w-xs mx-auto">
            <button onClick={() => { setStep('upload'); setResult(null); setCsvData(null) }} className="btn-secondary flex-1">Import More</button>
            <button onClick={() => navigate('/scan')} className="btn-primary flex-1">Start Scanning</button>
          </div>
        </div>
      )}
    </div>
  )
}
