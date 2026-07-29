import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import AddBookModal from '../components/AddBookModal'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { pagePadding } from '../lib/layout'

function EmptySlotCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px dashed ${hovered ? 'var(--cyan)' : 'var(--border)'}`,
        borderRadius: 8,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', gap: 10,
        background: hovered ? 'rgba(34,211,238,0.03)' : 'transparent',
        transition: 'border-color 130ms, background 130ms',
        aspectRatio: '2/3',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: hovered ? 'rgba(34,211,238,0.1)' : 'transparent',
        border: `1px solid ${hovered ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 130ms',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={hovered ? 'var(--cyan)' : 'var(--muted)'}
          strokeWidth="2" strokeLinecap="round" style={{ transition: 'stroke 130ms' }}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: hovered ? 'var(--cyan)' : 'var(--muted)', transition: 'color 130ms', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        adicionar
      </span>
    </div>
  )
}

const PHASE_CFG: Record<number, { label: string; color: string }> = {
  1: { label: 'Python',      color: 'var(--cyan)'  },
  2: { label: 'Web & APIs',  color: 'var(--blue)'  },
  3: { label: 'Dados',       color: '#a78bfa'      },
  4: { label: 'Qualidade',   color: 'var(--yellow)'},
  5: { label: 'Testes',      color: 'var(--green)' },
  6: { label: 'Produção',    color: '#f97316'      },
  7: { label: 'Mentalidade', color: '#ec4899'      },
}

interface Book {
  slug: string
  title: string
  author: string
  year: number | null
  phase: number | null
  available: boolean
  progress: number
  cover_url: string | null
  content_type: string
}

function getLocalProgress(slug: string): number {
  try {
    const raw = localStorage.getItem(`book_progress_${slug}`)
    if (!raw) return 0
    return JSON.parse(raw).scrollPercent ?? 0
  } catch { return 0 }
}

function withProgress(books: Omit<Book, 'progress'>[]): Book[] {
  return books.map(b => ({ ...b, progress: getLocalProgress(b.slug) }))
}

// ── FilterTab ─────────────────────────────────────────────────────────────────
function FilterTab({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color: string; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
        background: active ? `${color}18` : hovered ? 'var(--bg-card)' : 'transparent',
        border: `1px solid ${active ? `${color}50` : hovered ? 'var(--border-lit)' : 'var(--border)'}`,
        color: active ? color : hovered ? 'var(--text)' : 'var(--muted)',
        fontSize: 11, fontWeight: active ? 700 : 500,
        transition: 'all 130ms',
      }}
    >
      {label}
      <span style={{
        fontSize: 9, fontWeight: 700, color: active ? color : 'var(--faint)',
        background: active ? `${color}25` : 'transparent',
        padding: '1px 5px', borderRadius: 3, transition: 'all 130ms',
      }}>
        {count}
      </span>
    </button>
  )
}

// ── BookCard ──────────────────────────────────────────────────────────────────
function BookCard({ book, onClick, onDelete }: { book: Book; onClick: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [coverSrc, setCoverSrc] = useState<string | null>(null)
  const [coverLoading, setCoverLoading] = useState(true)
  const [resolvedCoverUrl, setResolvedCoverUrl] = useState<string | null>(book.cover_url)
  const phase = book.phase != null ? PHASE_CFG[book.phase] : null
  const phaseColor = phase?.color ?? 'var(--muted)'

  // If the book has no cover, search client-side then ask the worker to store it
  useEffect(() => {
    if (book.cover_url) return
    let cancelled = false

    async function autoFetch() {
      const title = book.title
      let foundUrl: string | undefined

      // 1. Google Books (with API key)
      try {
        const q = encodeURIComponent(`intitle:${title}`)
        const key = import.meta.env.VITE_BOOKS_API_KEY ? `&key=${import.meta.env.VITE_BOOKS_API_KEY}` : ''
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items(volumeInfo(imageLinks))${key}`)
        if (res.ok) {
          const data = await res.json()
          const il = data.items?.[0]?.volumeInfo?.imageLinks
          const raw: string | undefined = il?.extraLarge ?? il?.large ?? il?.medium ?? il?.small ?? il?.thumbnail ?? il?.smallThumbnail
          if (raw) foundUrl = raw.replace(/^http:\/\//, 'https://').replace('&edge=curl', '')
        }
      } catch { /* try next */ }

      // 2. Open Library fallback
      if (!foundUrl) {
        try {
          const q = encodeURIComponent(title)
          const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=1&fields=cover_i`)
          if (res.ok) {
            const data = await res.json()
            const coverId = data.docs?.[0]?.cover_i
            if (coverId) foundUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          }
        } catch { /* no cover */ }
      }

      if (cancelled || !foundUrl) { setCoverLoading(false); return }

      // Send to worker to store permanently in R2
      try {
        const r = await api.post(`/books/${book.slug}/fetch-cover`, { cover_url: foundUrl })
        if (!cancelled && r.data.cover_url) setResolvedCoverUrl(r.data.cover_url)
        else setCoverLoading(false)
      } catch { setCoverLoading(false) }
    }

    autoFetch()
    return () => { cancelled = true }
  }, [book.slug, book.cover_url])

  // Fetch cover blob via authenticated client
  useEffect(() => {
    if (!resolvedCoverUrl) { setCoverLoading(false); return }
    let objectUrl: string | null = null
    api.get(resolvedCoverUrl, { responseType: 'blob' })
      .then(r => { objectUrl = URL.createObjectURL(r.data); setCoverSrc(objectUrl) })
      .catch(() => {})
      .finally(() => setCoverLoading(false))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [resolvedCoverUrl])

  const initials = book.title.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
      onClick={confirming ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)',
        border: `1px solid ${confirming ? 'rgba(248,81,73,0.4)' : hovered ? 'var(--border-lit)' : 'var(--border)'}`,
        borderRadius: 8, overflow: 'hidden',
        cursor: confirming ? 'default' : 'pointer',
        transform: hovered && !confirming ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'border-color 130ms, transform 160ms, box-shadow 130ms',
        boxShadow: hovered && !confirming ? '0 8px 24px rgba(0,0,0,0.45)' : '0 1px 4px rgba(0,0,0,0.2)',
      }}
    >
      {/* Phase spine */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: phaseColor, opacity: 0.85, zIndex: 2,
      }} />

      {/* Delete button */}
      {!confirming && (
        <button
          onClick={e => { stopProp(e); setConfirming(true) }}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 4,
            width: 28, height: 28, padding: 0, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered ? 'rgba(10,10,10,0.75)' : 'transparent',
            border: `1px solid ${hovered ? 'rgba(248,81,73,0.4)' : 'transparent'}`,
            color: hovered ? '#f85149' : 'transparent',
            cursor: 'pointer', transition: 'all 130ms', backdropFilter: 'blur(4px)',
          }}
          title="Deletar livro"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      )}

      {/* Confirmation overlay */}
      {confirming && (
        <div
          onClick={stopProp}
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: 'rgba(10,10,10,0.92)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, fontWeight: 700 }}>Deletar livro?</p>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0, textAlign: 'center', maxWidth: 160, lineHeight: 1.6 }}>
            Arquivo e capa serão removidos permanentemente.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={e => { stopProp(e); setConfirming(false) }}
              style={{ padding: '5px 14px', borderRadius: 5, fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'var(--font)' }}>
              cancelar
            </button>
            <button onClick={e => { stopProp(e); onDelete() }}
              style={{ padding: '5px 14px', borderRadius: 5, fontSize: 11, cursor: 'pointer', background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149', fontWeight: 700, fontFamily: 'var(--font)' }}>
              deletar
            </button>
          </div>
        </div>
      )}

      {/* Cover — always 2:3 portrait ratio */}
      <div style={{ aspectRatio: '2/3', position: 'relative', marginLeft: 3, overflow: 'hidden', flexShrink: 0 }}>
        {coverLoading ? (
          <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
        ) : coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center top',
              display: 'block',
            }}
          />
        ) : (
          // Stylized placeholder
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(160deg, ${phaseColor}22 0%, #0d1117 70%)`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: '16px 14px',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: `${phaseColor}20`,
              border: `1px solid ${phaseColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: phaseColor,
            }}>
              {initials}
            </div>
            <p style={{
              fontSize: 10, fontWeight: 600, color: 'var(--muted)',
              textAlign: 'center', lineHeight: 1.6, margin: 0,
              display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as React.CSSProperties}>
              {book.title}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          {phase && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: phaseColor, padding: '2px 6px', borderRadius: 3,
              background: `${phaseColor}15`, border: `1px solid ${phaseColor}30`,
            }}>
              {phase.label}
            </span>
          )}
          {book.progress > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--green)' }}>
              {book.progress}%
            </span>
          )}
        </div>

        <p style={{
          fontSize: 11, fontWeight: 700, margin: '0 0 3px', color: 'var(--text)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {book.title}
        </p>

        <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.author}{book.year ? ` · ${book.year}` : ''}
        </p>

        {book.progress > 0 && (
          <div style={{ marginTop: 8, height: 2, background: 'var(--border)', borderRadius: 1 }}>
            <div style={{ width: `${book.progress}%`, height: '100%', background: 'var(--green)', borderRadius: 1 }} />
          </div>
        )}
      </div>
    </div>
  )
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function BooksPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [slotLimit, setSlotLimit] = useState(4)
  const [activePhase, setActivePhase] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchBooks = useCallback(() => {
    api.get('/books').then(r => {
      const data = r.data
      const rawBooks = Array.isArray(data) ? data : (data.books ?? [])
      setBooks(withProgress(rawBooks as Omit<Book, 'progress'>[]))
      if (data.slot_limit) setSlotLimit(data.slot_limit)
    }).catch(() => {})
  }, [])

  const handleDelete = useCallback((slug: string) => {
    api.delete(`/books/${slug}`)
      .then(() => setBooks(prev => prev.filter(b => b.slug !== slug)))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const filtered = useMemo(
    () => activePhase === null ? books : books.filter(b => b.phase === activePhase),
    [books, activePhase],
  )

  const totalStarted = books.filter(b => b.progress > 0).length

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => fetchBooks()}
        />
      )}

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: pagePadding('52px 48px 72px', isMobile) }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--cyan)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em' }}>
            // biblioteca de referência
          </p>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
            livros
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 20px', maxWidth: 500, lineHeight: 1.7 }}>
            Seus livros de referência em Markdown ou PDF. Adicione o arquivo e leia direto na plataforma.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--f-mono)' }}>{books.length}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>/</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--muted)', fontFamily: 'var(--f-mono)', marginLeft: 4 }}>{slotLimit}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 7 }}>slots</span>
            </div>
            {totalStarted > 0 && (
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--f-mono)' }}>{totalStarted}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 7 }}>em leitura</span>
              </div>
            )}

            {books.length < slotLimit ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-cyan"
                style={{ marginLeft: 'auto', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                adicionar livro
              </button>
            ) : (
              <button
                onClick={() => navigate('/store')}
                style={{
                  marginLeft: 'auto', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '7px 13px', cursor: 'pointer',
                  color: 'var(--muted)', fontFamily: 'var(--f-mono)',
                  transition: 'border-color 130ms, color 130ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-lit)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
              >
                comprar slots →
              </button>
            )}
          </div>
        </div>

        {books.length === 0 ? (
          <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, animationDelay: '80ms', opacity: 0 }}>
            {Array.from({ length: slotLimit }).map((_, i) => (
              <EmptySlotCard key={`empty-${i}`} onClick={() => setShowAddModal(true)} />
            ))}
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="fade-up" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, animationDelay: '40ms', opacity: 0 }}>
              <FilterTab
                label="todos" count={books.length} active={activePhase === null}
                color="var(--text)" onClick={() => setActivePhase(null)}
              />
              {Object.entries(PHASE_CFG).map(([id, cfg]) => {
                const count = books.filter(b => b.phase === Number(id)).length
                if (count === 0) return null
                return (
                  <FilterTab
                    key={id}
                    label={cfg.label}
                    count={count}
                    active={activePhase === Number(id)}
                    color={cfg.color}
                    onClick={() => setActivePhase(activePhase === Number(id) ? null : Number(id))}
                  />
                )
              })}
            </div>

            {/* Grid */}
            <div
              className="fade-up"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, animationDelay: '80ms', opacity: 0 }}
            >
              {filtered.map(book => (
                <BookCard
                  key={book.slug}
                  book={book}
                  onClick={() => navigate(`/books/${book.slug}`)}
                  onDelete={() => handleDelete(book.slug)}
                />
              ))}
              {activePhase === null && Array.from({ length: Math.max(0, slotLimit - books.length) }).map((_, i) => (
                <EmptySlotCard key={`empty-${i}`} onClick={() => setShowAddModal(true)} />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
