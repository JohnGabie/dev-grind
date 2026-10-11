export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  const d = Math.floor(diff / 8.64e7)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  return 'agora'
}

const STATUS: Record<string, string> = { passed: 'concluído', failed: 'falhou', in_progress: 'em progresso' }

export function statusWord(status: string): string {
  return STATUS[status] ?? status
}

export function promptUser(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? ''
  const user = first.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return user || 'dev'
}
