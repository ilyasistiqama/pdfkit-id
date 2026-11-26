import { useState } from 'react'
import { canPersistSensitiveData } from '../signatureStore'
import { inputClass, Status } from './ToolUi'

type Preset<T> = { name: string; settings: T }

const limit = 20
const sessionPresets = new Map<string, string>()

function readPresets<T>(key: string, parse: (value: unknown) => T | null): Preset<T>[] {
  try {
    const data: unknown = JSON.parse(sessionPresets.get(key) ?? localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(data)) return []
    return data.flatMap((item) => {
      if (!item || typeof item.name !== 'string' || !item.name.trim()) return []
      const settings = parse(item.settings)
      return settings ? [{ name: item.name, settings }] : []
    }).slice(0, limit)
  } catch {
    return []
  }
}

export function LocalPresets<T>({ storageKey, label, settings, parse, onApply }: {
  storageKey: string
  label: string
  settings: T
  parse: (value: unknown) => T | null
  onApply: (settings: T) => void
}) {
  const [presets, setPresets] = useState(() => readPresets(storageKey, parse))
  const [name, setName] = useState('')
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const existing = presets.find((preset) => preset.name === selected)
  const persistent = canPersistSensitiveData()

  const write = (items: Preset<T>[]) => {
    try {
      const serialized = JSON.stringify(items)
      if (persistent) localStorage.setItem(storageKey, serialized)
      sessionPresets.set(storageKey, serialized)
      setPresets(items)
      setError('')
      return true
    } catch {
      setError('Pengaturan tidak bisa disimpan di browser ini.')
      return false
    }
  }

  const save = () => {
    const title = name.trim()
    if (!title) return
    if (presets.some((preset) => preset.name === title)) {
      setError('Nama ini sudah dipakai. Gunakan nama lain.')
      return
    }
    if (presets.length >= limit) {
      setError(`Maksimal ${limit} pengaturan tersimpan. Hapus satu untuk menyimpan yang baru.`)
      return
    }
    if (write([...presets, { name: title, settings }])) {
      setSelected(title)
      setName('')
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70">
      <p className="text-sm font-medium">{label} {persistent ? 'di browser ini' : 'selama tab ini terbuka'}</p>
      <div className="flex flex-wrap gap-2">
        <select aria-label={`${label} tersimpan`} className={`${inputClass} min-w-40 flex-1`} value={selected}
          onChange={(event) => setSelected(event.target.value)}>
          <option value="">Pilih {label.toLowerCase()} tersimpan</option>
          {presets.map((preset) => <option key={preset.name}>{preset.name}</option>)}
        </select>
        <button type="button" className="rounded-xl bg-sunken px-3 text-sm disabled:opacity-40" disabled={!existing}
          onClick={() => existing && onApply(existing.settings)}>Terapkan</button>
        <button type="button" className="rounded-xl px-3 text-sm text-loss disabled:opacity-40" disabled={!existing}
          onClick={() => { if (write(presets.filter((preset) => preset.name !== selected))) setSelected('') }}>Hapus</button>
      </div>
      <div className="flex gap-2">
        <input className={inputClass} aria-label={`Nama ${label.toLowerCase()}`} placeholder={`Nama ${label.toLowerCase()} baru`}
          value={name} onChange={(event) => { setName(event.target.value); setError('') }} maxLength={60} />
        <button type="button" className="shrink-0 rounded-xl bg-gold-soft px-3 text-sm font-medium text-gold disabled:opacity-40"
          disabled={!name.trim()} onClick={save}>Simpan {label.toLowerCase()}</button>
      </div>
      {error && <Status tone="error">{error}</Status>}
    </div>
  )
}
