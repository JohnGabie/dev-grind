import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import api from '../api/client'
import { getAiConfig } from '../api/aiConfig'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { pagePadding } from '../lib/layout'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type SourceType = 'exercise' | 'course' | 'book' | 'dashboard' | 'general'

interface ConversationSource {
  type: SourceType
  title: string
  subtitle?: string
  slug?: string
}

interface Conversation {
  id: string
  title: string
  context: string
  source?: ConversationSource
  messages: Message[]
  updated_at: string
}

const SOURCE_CFG: Record<SourceType, { label: string; color: string; icon: React.ReactNode }> = {
  exercise: {
    label: 'exercício',
    color: '#22d3ee',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  course: {
    label: 'curso',
    color: '#a855f7',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  book: {
    label: 'livro',
    color: '#f59e0b',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  dashboard: {
    label: 'dashboard',
    color: '#3b82f6',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  general: {
    label: 'geral',
    color: '#717171',
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
}

function SourceBadge({ source, size = 'sm' }: { source: ConversationSource; size?: 'sm' | 'md' }) {
  const cfg = SOURCE_CFG[source.type]
  const isMd = size === 'md'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: isMd ? 6 : 4,
      background: `${cfg.color}10`,
      border: `1px solid ${cfg.color}28`,
      borderRadius: 5,
      padding: isMd ? '4px 10px' : '2px 7px',
      maxWidth: isMd ? 360 : 180,
      overflow: 'hidden',
    }}>
      <span style={{ color: cfg.color, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{cfg.icon}</span>
      <span style={{
        fontSize: isMd ? 11 : 9, fontFamily: 'var(--f-mono)',
        color: cfg.color, letterSpacing: '0.04em', fontWeight: 600,
        flexShrink: 0,
      }}>
        {cfg.label}
      </span>
      <span style={{
        fontSize: isMd ? 11 : 9, fontFamily: 'var(--f-mono)',
        color: isMd ? 'var(--text)' : 'rgba(240,240,240,0.55)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        · {source.title}
        {source.subtitle && (
          <span style={{ opacity: 0.55 }}> · {source.subtitle}</span>
        )}
      </span>
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  const d = Math.floor(diff / 8.64e7)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  return 'agora'
}

function mkId() {
  return Math.random().toString(36).slice(2, 10)
}

// ── Componentes menores ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--muted)',
          animation: `chatDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

const mdComponents = {
  code({ children, className, ...props }: any) {
    const isBlock = !!className
    if (isBlock) {
      return (
        <pre style={{
          background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)',
          borderRadius: 5, padding: '10px 14px', overflowX: 'auto',
          margin: '8px 0', fontSize: 12, lineHeight: 1.6,
          fontFamily: 'var(--f-mono)',
        }}>
          <code className={className} style={{ background: 'none', padding: 0 }} {...props}>{children}</code>
        </pre>
      )
    }
    return (
      <code style={{
        background: 'rgba(255,255,255,0.07)', padding: '1px 5px',
        borderRadius: 3, fontSize: 12, fontFamily: 'var(--f-mono)',
      }} {...props}>{children}</code>
    )
  },
  pre({ children }: any) { return <>{children}</> },
  p({ children }: any) { return <p style={{ margin: '0 0 8px' }}>{children}</p> },
  ul({ children }: any) { return <ul style={{ margin: '4px 0 8px', paddingLeft: 18 }}>{children}</ul> },
  ol({ children }: any) { return <ol style={{ margin: '4px 0 8px', paddingLeft: 18 }}>{children}</ol> },
  li({ children }: any) { return <li style={{ marginBottom: 2 }}>{children}</li> },
  strong({ children }: any) { return <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{children}</strong> },
  h1({ children }: any) { return <h1 style={{ fontSize: 15, fontWeight: 700, margin: '12px 0 6px', color: 'var(--text)' }}>{children}</h1> },
  h2({ children }: any) { return <h2 style={{ fontSize: 13, fontWeight: 700, margin: '10px 0 5px', color: 'var(--text)' }}>{children}</h2> },
  h3({ children }: any) { return <h3 style={{ fontSize: 12, fontWeight: 700, margin: '8px 0 4px', color: 'var(--text)' }}>{children}</h3> },
  blockquote({ children }: any) {
    return (
      <blockquote style={{
        borderLeft: '3px solid var(--border-lit)', paddingLeft: 12, margin: '8px 0',
        color: 'var(--muted)',
      }}>{children}</blockquote>
    )
  },
}

function MessageBubble({ msg, isNew }: { msg: Message; isNew?: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '78%',
      animation: isNew ? 'chatFadeUp 200ms ease forwards' : 'none',
    }}>
      <div style={{
        padding: '10px 14px',
        borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
        background: isUser ? 'rgba(34,211,238,0.09)' : 'var(--bg-card)',
        border: `1px solid ${isUser ? 'rgba(34,211,238,0.22)' : 'var(--border)'}`,
        fontSize: 13, color: 'var(--text)', lineHeight: 1.7,
        fontFamily: 'var(--f-mono)',
      }}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
        ) : (
          <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
        )}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ChatPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const navigate = useNavigate()
  const [aiConfig, setAiConfig] = useState(getAiConfig)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Re-read config when window gets focus (user may have just set it in /config)
  useEffect(() => {
    const refresh = () => setAiConfig(getAiConfig())
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const active = convs.find(c => c.id === activeId) ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length, sending])

  const newConversation = useCallback(() => {
    const id = mkId()
    const conv: Conversation = {
      id, title: 'Nova conversa',
      context: 'general', messages: [],
      updated_at: new Date().toISOString(),
    }
    setConvs(prev => [conv, ...prev])
    setActiveId(id)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !active) return
    setInput('')

    const userMsg: Message = { id: mkId(), role: 'user', content: text, timestamp: new Date().toISOString() }
    const isFirst = active.messages.length === 0

    setNewMsgIds(s => new Set(s).add(userMsg.id))
    setConvs(prev => prev.map(c => c.id === activeId
      ? { ...c, title: isFirst ? text.slice(0, 60) : c.title, messages: [...c.messages, userMsg], updated_at: new Date().toISOString() }
      : c
    ))

    setSending(true)
    try {
      const cfg = getAiConfig()
      const history = active.messages.map(m => ({ role: m.role, content: m.content }))
      const { data } = await api.post('/chat', {
        message: text,
        history,
        api_key:  cfg.api_key,
        base_url: cfg.base_url,
        model:    cfg.model,
      })
      const aiMsg: Message = { id: mkId(), role: 'assistant', content: data.response, timestamp: new Date().toISOString() }
      setNewMsgIds(s => new Set(s).add(aiMsg.id))
      setConvs(prev => prev.map(c => c.id === activeId
        ? { ...c, messages: [...c.messages, aiMsg], updated_at: new Date().toISOString() }
        : c
      ))
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Erro desconhecido.'
      const errMsg: Message = {
        id: mkId(), role: 'assistant',
        content: `⚠ ${detail}`,
        timestamp: new Date().toISOString(),
      }
      setNewMsgIds(s => new Set(s).add(errMsg.id))
      setConvs(prev => prev.map(c => c.id === activeId
        ? { ...c, messages: [...c.messages, errMsg] }
        : c
      ))
    } finally {
      setSending(false)
    }
  }, [input, sending, active, activeId])

  return (
    <>
      <style>{`
        @keyframes chatDot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes chatFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* ── Left panel — conversation list ─────────────────────────────── */}
        <div style={{
          width: 260, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          height: '100%',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 14px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: 'rgba(240,240,240,0.45)',
              fontFamily: 'var(--f-mono)',
            }}>
              Chat IA
            </span>
            <button
              onClick={newConversation}
              title="Nova conversa"
              style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'var(--cyan-faint)',
                border: '1px solid var(--cyan-glow)',
                color: 'var(--cyan)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,238,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--cyan-faint)'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {convs.length === 0 && (
              <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Nenhuma conversa ainda.
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>
                  Clique em + para começar.
                </p>
              </div>
            )}
            {convs.map(c => {
              const isActive = c.id === activeId
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '11px 14px',
                    background: isActive ? 'rgba(34,211,238,0.05)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--cyan)' : 'transparent'}`,
                    borderTop: 'none', borderRight: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 120ms, border-left-color 120ms',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <p style={{
                    margin: 0, fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--text)' : 'rgba(240,240,240,0.6)',
                    lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    {c.source && <SourceBadge source={c.source} size="sm" />}
                    <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--f-mono)', marginLeft: 'auto', flexShrink: 0 }}>
                      {timeAgo(c.updated_at)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Right panel — active chat or welcome ─────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* Subtle background mesh */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 70% 50% at 50% 100%, rgba(34,211,238,0.03) 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 80% 20%, rgba(59,130,246,0.025) 0%, transparent 60%)
            `,
          }} />

          {!active ? (
            /* No conversation selected */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 16, position: 'relative', zIndex: 1,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--cyan-faint)', border: '1px solid var(--cyan-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cyan)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  Assistente de Aprendizado
                </p>
                <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Pergunte sobre exercícios, código, FastAPI, SQL, HTTP.
                </p>
                <button
                  onClick={newConversation}
                  style={{
                    fontSize: 12, padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)',
                    color: 'var(--cyan)', fontFamily: 'var(--f-mono)',
                  }}
                >
                  + Nova conversa
                </button>
                {!aiConfig.api_key && (
                  <p style={{ margin: '14px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                    <span style={{ opacity: 0.6 }}>Sem API key — </span>
                    <span
                      onClick={() => navigate('/config')}
                      style={{ color: 'var(--cyan)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      configurar agora
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: pagePadding('28px 32px 24px', isMobile),
                display: 'flex', flexDirection: 'column', gap: 12,
                position: 'relative', zIndex: 1,
              }}>
                {/* Conversation header */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <p style={{
                      margin: 0, fontSize: 15, fontWeight: 700,
                      color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.3,
                    }}>
                      {active.title}
                    </p>
                    {active.source && active.source.type !== 'general' && (
                      <SourceBadge source={active.source} size="md" />
                    )}
                  </div>
                  <div style={{ marginTop: 14, height: 1, background: 'var(--border)' }} />
                </div>

                {active.messages.length === 0 && !sending && (
                  <div style={{
                    margin: 'auto', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  }}>
                    {!aiConfig.api_key ? (
                      <>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: 'rgba(113,113,113,0.08)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--muted)',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            IA não configurada
                          </p>
                          <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
                            Adicione uma API key em Configurações para usar o chat.
                          </p>
                          <button
                            onClick={() => navigate('/config')}
                            style={{
                              fontSize: 12, padding: '7px 18px', borderRadius: 6, cursor: 'pointer',
                              background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)',
                              color: 'var(--cyan)',
                            }}
                          >
                            Ir para Configurações →
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: 'var(--cyan-faint)', border: '1px solid var(--cyan-glow)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--cyan)',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--muted)' }}>
                            faça uma pergunta para começar
                          </p>
                          <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)', opacity: 0.5, fontFamily: 'var(--f-mono)' }}>
                            {aiConfig.model} · {aiConfig.base_url.replace('https://', '').split('/')[0]}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {active.messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} />
                ))}

                {sending && (
                  <div style={{ alignSelf: 'flex-start' }}>
                    <div style={{
                      padding: '10px 16px',
                      borderRadius: '12px 12px 12px 3px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                    }}>
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                flexShrink: 0, padding: '14px 24px 18px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg)',
                position: 'relative', zIndex: 1,
              }}>
                <div style={{
                  display: 'flex', gap: 10,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: '8px 10px',
                  transition: 'border-color 150ms',
                }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--border-lit)')}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={aiConfig.api_key ? 'pergunte algo...' : 'configure a IA em Configurações para usar o chat'}
                    value={input}
                    disabled={!aiConfig.api_key}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    style={{
                      flex: 1, height: 28, padding: 0,
                      background: 'transparent', border: 'none',
                      color: aiConfig.api_key ? 'var(--text)' : 'var(--muted)',
                      fontSize: 13, fontFamily: 'var(--f-mono)', outline: 'none',
                      cursor: aiConfig.api_key ? 'text' : 'not-allowed',
                    }}
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || sending || !aiConfig.api_key}
                    style={{
                      width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                      background: input.trim() && !sending && aiConfig.api_key ? 'rgba(34,211,238,0.12)' : 'transparent',
                      border: `1px solid ${input.trim() && !sending && aiConfig.api_key ? 'rgba(34,211,238,0.3)' : 'transparent'}`,
                      cursor: input.trim() && !sending && aiConfig.api_key ? 'pointer' : 'not-allowed',
                      color: input.trim() && !sending && aiConfig.api_key ? 'var(--cyan)' : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 150ms',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <p style={{ margin: 0, fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--f-mono)', opacity: 0.5 }}>
                    {aiConfig.api_key ? 'Enter para enviar' : ''}
                  </p>
                  {aiConfig.api_key && (
                    <p style={{ margin: 0, fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--f-mono)', opacity: 0.4 }}>
                      {aiConfig.model}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
