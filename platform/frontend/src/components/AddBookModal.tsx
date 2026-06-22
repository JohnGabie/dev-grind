import { useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import api from '../api/client'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const PHASE_OPTIONS = [
  { value: 1, label: 'Python' },
  { value: 2, label: 'Web & APIs' },
  { value: 3, label: 'Dados' },
  { value: 4, label: 'Qualidade' },
  { value: 5, label: 'Testes' },
  { value: 6, label: 'Produção' },
  { value: 7, label: 'Mentalidade' },
]

interface Props {
  onClose: () => void
  onSuccess: () => void
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.(pdf|md)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function extractPdfMeta(file: File): Promise<{ title?: string; author?: string }> {
  try {
    const buf = await file.arrayBuffer()
    const task = pdfjsLib.getDocument({ data: new Uint8Array(buf) })
    // 6s timeout — if the PDF.js worker hasn't loaded yet it can hang indefinitely
    const pdf = await Promise.race([
      task.promise,
      new Promise<never>((_, reject) => setTimeout(() => { task.destroy(); reject(new Error('timeout')) }, 6000)),
    ])
    const meta = await pdf.getMetadata()
    const info = meta.info as Record<string, unknown>
    return {
      title: typeof info.Title === 'string' && info.Title ? info.Title : undefined,
      author: typeof info.Author === 'string' && info.Author ? info.Author : undefined,
    }
  } catch {
    return {}
  }
}

const BOOKS_API_KEY = import.meta.env.VITE_BOOKS_API_KEY as string | undefined

async function lookupGoogleBooks(
  query: string,
): Promise<{ title?: string; author?: string; year?: string; coverUrl?: string } | null> {
  try {
    const q = encodeURIComponent(`intitle:${query}`)
    const key = BOOKS_API_KEY ? `&key=${BOOKS_API_KEY}` : ''
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items(volumeInfo(title,authors,publishedDate,imageLinks))${key}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const vol = data.items?.[0]?.volumeInfo
    if (!vol) return null
    // Prefer largest available image, force https, remove page-fold artifact
    const rawCover: string | undefined =
      vol.imageLinks?.extraLarge ??
      vol.imageLinks?.large ??
      vol.imageLinks?.medium ??
      vol.imageLinks?.small ??
      vol.imageLinks?.thumbnail ??
      vol.imageLinks?.smallThumbnail
    const coverUrl = rawCover
      ? rawCover.replace(/^http:\/\//, 'https://').replace('&edge=curl', '')
      : undefined
    return {
      title: vol.title ?? undefined,
      author: vol.authors?.[0] ?? undefined,
      year: vol.publishedDate ? String(vol.publishedDate).slice(0, 4) : undefined,
      coverUrl,
    }
  } catch {
    return null
  }
}

async function lookupOpenLibraryCover(title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(title)
    const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=1&fields=cover_i`)
    if (!res.ok) return null
    const data = await res.json()
    const coverId = data.docs?.[0]?.cover_i
    if (!coverId) return null
    return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
  } catch {
    return null
  }
}

function tryParseMarkdownMeta(text: string) {
  const firstLine = text.split('\n')[0] ?? ''
  const m = firstLine.match(/^#\s+(.+?)\s+[—–\-]\s+(.+?)\s+\((\d{4})\)\s*$/)
  if (m) return { title: m[1].trim(), author: m[2].trim(), year: parseInt(m[3]) }
  const m2 = firstLine.match(/^#\s+(.+?)\s+[—–\-]\s+(.+)$/)
  if (m2) return { title: m2[1].trim(), author: m2[2].trim(), year: null }
  return null
}

type MetaSource = 'pdf' | 'google' | 'filename' | null

const SOURCE_LABEL: Record<NonNullable<MetaSource>, string> = {
  pdf: '✓ metadados do PDF',
  google: '✓ Google Books',
  filename: '✓ nome do arquivo',
}

export default function AddBookModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [bookFile, setBookFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [year, setYear] = useState('')
  const [phase, setPhase] = useState<number | null>(null)

  const [apiCoverUrl, setApiCoverUrl] = useState<string | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaSource, setMetaSource] = useState<MetaSource>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const bookInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  function handleBookFile(file: File) {
    setBookFile(file)
    setTitle('')
    setAuthor('')
    setYear('')
    setMetaSource(null)
    setApiCoverUrl(null)

    if (file.name.endsWith('.md')) {
      const reader = new FileReader()
      reader.onload = e => {
        const meta = tryParseMarkdownMeta((e.target?.result as string) ?? '')
        if (meta) {
          if (meta.title) setTitle(meta.title)
          if (meta.author) setAuthor(meta.author)
          if (meta.year) setYear(String(meta.year))
          setMetaSource('filename')
        }
      }
      reader.readAsText(file)
    }
  }

  function handleCoverFile(file: File) {
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleNextStep() {
    if (!bookFile) return

    if (!bookFile.name.endsWith('.pdf')) {
      setStep(2)
      return
    }

    setMetaLoading(true)
    try {
      const pdfMeta = await extractPdfMeta(bookFile)
      const filenameTitle = titleFromFilename(bookFile.name)

      let resolvedTitle = pdfMeta.title ?? ''
      let resolvedAuthor = pdfMeta.author ?? ''
      let resolvedYear = ''
      let source: NonNullable<MetaSource> = pdfMeta.title ? 'pdf' : 'filename'

      // Always call Google Books — even if PDF had title+author, we need the year
      const searchTitle = resolvedTitle || filenameTitle
      const gb = await lookupGoogleBooks(searchTitle)
      if (gb) {
        if (!resolvedTitle) resolvedTitle = gb.title ?? filenameTitle
        if (!resolvedAuthor) resolvedAuthor = gb.author ?? ''
        if (gb.year) resolvedYear = gb.year
        if (!pdfMeta.title) source = 'google'
        if (gb.coverUrl) {
          setApiCoverUrl(gb.coverUrl)
        } else {
          // Google Books has no cover — try Open Library
          const olCover = await lookupOpenLibraryCover(resolvedTitle || filenameTitle)
          if (olCover) setApiCoverUrl(olCover)
        }
      } else {
        if (!resolvedTitle) resolvedTitle = filenameTitle
        // No Google Books result — try Open Library for cover too
        const olCover = await lookupOpenLibraryCover(resolvedTitle || filenameTitle)
        if (olCover) setApiCoverUrl(olCover)
      }

      setTitle(resolvedTitle)
      setAuthor(resolvedAuthor)
      if (resolvedYear) setYear(resolvedYear)
      setMetaSource(source)
    } finally {
      setMetaLoading(false)
      setStep(2)
    }
  }

  async function handleSubmit() {
    if (!bookFile || !title.trim() || !author.trim()) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', bookFile)
    if (coverFile) fd.append('cover', coverFile)
    else if (apiCoverUrl) fd.append('cover_url', apiCoverUrl)
    fd.append('title', title.trim())
    fd.append('author', author.trim())
    if (year) fd.append('year', year)
    if (phase !== null) fd.append('phase', String(phase))
    try {
      await api.post('/books/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSuccess()
      onClose()
    } catch (e: any) {
      setUploadError(e.response?.data?.detail || 'Erro ao enviar livro.')
      setUploading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 10px',
    fontSize: 12, color: 'var(--text)', outline: 'none',
    fontFamily: 'var(--f-mono)',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--muted)',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'block', marginBottom: 5,
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480, background: 'var(--bg-card)',
        border: '1px solid var(--border-lit)', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>

        {/* Modal header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Adicionar livro</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>
              {step === 1 ? 'Passo 1 — Selecionar arquivo' : 'Passo 2 — Metadados'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, borderRadius: 4, lineHeight: 1 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px' }}>

          {/* ── Step 1: File selection ─────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                onClick={() => bookInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleBookFile(f) }}
                style={{
                  border: `2px dashed ${dragging ? 'var(--cyan)' : bookFile ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '32px 20px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  cursor: 'pointer', background: dragging ? 'rgba(34,211,238,0.04)' : bookFile ? 'rgba(34,197,94,0.04)' : 'transparent',
                  transition: 'all 150ms',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={bookFile ? 'var(--green)' : 'var(--muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {bookFile
                    ? <path d="M20 6L9 17l-5-5" />
                    : <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>
                  }
                </svg>
                {bookFile ? (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--green)', textAlign: 'center', wordBreak: 'break-all' }}>
                    {bookFile.name}
                  </p>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', textAlign: 'center' }}>
                      Arraste o arquivo ou clique para selecionar
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>
                      Aceita .md e .pdf
                    </p>
                  </>
                )}
              </div>
              <input ref={bookInputRef} type="file" accept=".md,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleBookFile(f) }} />

              {/* Cover (optional) */}
              <div>
                <label style={labelStyle}>Capa (opcional)</label>
                {coverPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={coverPreview} alt="cover" style={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text)' }}>{coverFile?.name}</p>
                      <button onClick={() => { setCoverFile(null); setCoverPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--muted)', padding: 0 }}>
                        remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '8px 14px', fontSize: 11, color: 'var(--muted)', cursor: 'pointer', transition: 'border-color 130ms, color 130ms' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-lit)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                  >
                    + Selecionar imagem
                  </button>
                )}
                <input ref={coverInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f) }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={handleNextStep}
                  disabled={!bookFile || metaLoading}
                  className="btn btn-cyan"
                  style={{ fontSize: 12, opacity: bookFile ? 1 : 0.4, minWidth: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  {metaLoading ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      buscando...
                    </>
                  ) : 'Próximo →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Metadata ───────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Source badge */}
              {metaSource && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--f-mono)' }}>
                    {SOURCE_LABEL[metaSource]} — revise e edite se necessário
                  </span>
                </div>
              )}

              <div>
                <label style={labelStyle}>Título *</label>
                <input
                  style={inputStyle} value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="ex: Clean Code Fundamentals"
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Autor *</label>
                <input
                  style={inputStyle} value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="ex: Robert C. Martin"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Ano</label>
                  <input
                    style={inputStyle} value={year} type="number" min={1900} max={2099}
                    onChange={e => setYear(e.target.value)}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={phase ?? ''}
                    onChange={e => setPhase(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— sem categoria —</option>
                    {PHASE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(coverPreview || apiCoverUrl) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={coverPreview ?? apiCoverUrl!}
                    alt="cover"
                    style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 3, border: '1px solid var(--border)' }}
                  />
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>
                      {coverPreview ? 'capa selecionada' : '✓ capa do Google Books'}
                    </span>
                    {!coverPreview && (
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--cyan)', padding: 0, fontFamily: 'var(--f-mono)' }}
                      >
                        trocar por outra
                      </button>
                    )}
                  </div>
                </div>
              )}

              {uploadError && (
                <p style={{ fontSize: 11, color: 'var(--red)', margin: 0 }}>{uploadError}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading || !title.trim() || !author.trim()}
                  className="btn btn-cyan"
                  style={{ fontSize: 12, opacity: (!title.trim() || !author.trim()) ? 0.4 : 1 }}
                >
                  {uploading ? 'Enviando...' : 'Adicionar livro'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
