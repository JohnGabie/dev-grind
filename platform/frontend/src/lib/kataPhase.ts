/** Footer rules of the kata step in a lesson (Courses MD, Part 5, "O passo dentro da lição"). */

export type VerifyResult = 'passed' | 'failed' | 'post_error' | 'grader_error' | 'busy'

export const KATA_PHASES = ['loading', 'error', 'ready', 'running', 'failed', 'post_error', 'grader_error', 'passed'] as const
export type KataPhase = typeof KATA_PHASES[number]

export type FooterAction = 'advance' | 'verify' | 'ignore'

const NO_SLUG = 'Este passo não indica qual kata abrir.'
const LOAD_FAILED = 'Não foi possível carregar este kata.'

const VERIFIABLE: readonly KataPhase[] = ['ready', 'failed', 'post_error', 'grader_error']

/** An empty slug never reaches the GET. A slug waits for the GET: never optimistic. */
export function initialKataState(slug: string): { phase: KataPhase; error: string | null } {
  return slug ? { phase: 'loading', error: null } : { phase: 'error', error: NO_SLUG }
}

export function phaseAfterLoad(userStatus: string | undefined): KataPhase {
  return userStatus === 'completed' ? 'passed' : 'ready'
}

/** `null` for 401: the axios interceptor already sends the user to /login. */
export function loadErrorMessage(status: number | undefined, slug: string): string | null {
  if (status === 401) return null
  return status === 404 ? `Não encontrei o kata «${slug}».` : LOAD_FAILED
}

export function footerButton(phase: KataPhase, solverBusy: boolean, last: boolean): { label: string; enabled: boolean } {
  if (phase === 'passed') return { label: last ? 'concluir' : 'continuar', enabled: true }
  if (phase === 'running') return { label: 'enviando…', enabled: false }
  return { label: 'verificar', enabled: VERIFIABLE.includes(phase) && !solverBusy }
}

/** `inFlight` is a ref written before the await: the phase state may not be committed yet. */
export function footerAction(phase: KataPhase, inFlight: boolean, solverBusy: boolean): FooterAction {
  if (inFlight || phase === 'running') return 'ignore'
  if (phase === 'passed') return 'advance'
  return VERIFIABLE.includes(phase) && !solverBusy ? 'verify' : 'ignore'
}

/** `busy` never becomes `failed`: it would paint over a POST that already returned 201. */
export function phaseAfterVerify(result: VerifyResult | undefined, before: KataPhase): KataPhase {
  return !result || result === 'busy' ? before : result
}
