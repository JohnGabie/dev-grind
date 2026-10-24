import test from 'node:test'
import assert from 'node:assert/strict'
import {
  KATA_PHASES,
  footerAction,
  footerButton,
  initialKataState,
  loadErrorMessage,
  phaseAfterLoad,
  phaseAfterVerify,
  type KataPhase,
} from './kataPhase.ts'

test('an empty slug starts in error with its own phrase, before any GET', () => {
  assert.deepEqual(initialKataState(''), { phase: 'error', error: 'Este passo não indica qual kata abrir.' })
})

test('a slug starts in loading, never in passed', () => {
  assert.deepEqual(initialKataState('saudacao'), { phase: 'loading', error: null })
})

test('the GET decides between ready and passed by user_status', () => {
  assert.equal(phaseAfterLoad('completed'), 'passed')
  assert.equal(phaseAfterLoad('attempted'), 'ready')
  assert.equal(phaseAfterLoad('not_attempted'), 'ready')
  assert.equal(phaseAfterLoad(undefined), 'ready')
})

test('a 404 names the slug', () => {
  assert.equal(loadErrorMessage(404, 'nao-existe'), 'Não encontrei o kata «nao-existe».')
})

test('a network error or a 500 is a generic load error', () => {
  assert.equal(loadErrorMessage(undefined, 'saudacao'), 'Não foi possível carregar este kata.')
  assert.equal(loadErrorMessage(500, 'saudacao'), 'Não foi possível carregar este kata.')
})

test('a 401 is left to the interceptor', () => {
  assert.equal(loadErrorMessage(401, 'saudacao'), null)
})

test('loading and error show verificar disabled', () => {
  for (const phase of ['loading', 'error'] as const) {
    assert.deepEqual(footerButton(phase, false, false), { label: 'verificar', enabled: false })
  }
})

test('ready shows verificar, disabled while the solver is busy', () => {
  assert.deepEqual(footerButton('ready', false, false), { label: 'verificar', enabled: true })
  assert.deepEqual(footerButton('ready', true, false), { label: 'verificar', enabled: false })
})

test('running shows enviando… disabled', () => {
  assert.deepEqual(footerButton('running', true, false), { label: 'enviando…', enabled: false })
  assert.deepEqual(footerButton('running', false, true), { label: 'enviando…', enabled: false })
})

test('failed, post_error and grader_error show verificar, never tentar novamente', () => {
  for (const phase of ['failed', 'post_error', 'grader_error'] as const) {
    assert.deepEqual(footerButton(phase, false, false), { label: 'verificar', enabled: true })
    assert.deepEqual(footerButton(phase, true, false), { label: 'verificar', enabled: false })
  }
})

test('passed shows continuar, or concluir on the last step', () => {
  assert.deepEqual(footerButton('passed', false, false), { label: 'continuar', enabled: true })
  assert.deepEqual(footerButton('passed', false, true), { label: 'concluir', enabled: true })
})

test('only passed advances', () => {
  for (const phase of KATA_PHASES) {
    const action = footerAction(phase, false, false)
    if (phase === 'passed') assert.equal(action, 'advance')
    else assert.notEqual(action, 'advance', phase)
  }
})

test('a click while a verify is in flight does nothing, whatever the phase says', () => {
  for (const phase of KATA_PHASES) assert.equal(footerAction(phase, true, false), 'ignore', phase)
})

test('a click in running does nothing', () => {
  assert.equal(footerAction('running', false, false), 'ignore')
})

test('ready, failed, post_error and grader_error verify when the solver is idle', () => {
  for (const phase of ['ready', 'failed', 'post_error', 'grader_error'] as const) {
    assert.equal(footerAction(phase, false, false), 'verify', phase)
    assert.equal(footerAction(phase, false, true), 'ignore', phase)
  }
})

test('loading and error never verify', () => {
  assert.equal(footerAction('loading', false, false), 'ignore')
  assert.equal(footerAction('error', false, false), 'ignore')
})

test('each verify result becomes the phase of the same name', () => {
  for (const result of ['passed', 'failed', 'post_error', 'grader_error'] as const) {
    assert.equal(phaseAfterVerify(result, 'ready'), result)
  }
})

test('busy or no answer returns to the phase before, never failed', () => {
  const before: KataPhase = 'post_error'
  assert.equal(phaseAfterVerify('busy', before), before)
  assert.equal(phaseAfterVerify(undefined, before), before)
  assert.equal(phaseAfterVerify('busy', 'ready'), 'ready')
})
