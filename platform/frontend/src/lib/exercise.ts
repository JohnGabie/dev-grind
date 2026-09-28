/** Cor por rank. Estava copiada em ExercisePage, KataListPage, DashboardPage e
 *  AppLayout; as duas páginas de exercício agora leem daqui. */
export const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}

/** O enunciado vira HTML via innerHTML, então tudo que vem do banco é escapado
 *  antes — só a marcação que esta função gera é confiável. Sem isso, uma
 *  descrição com `<img onerror=...>` executaria, o que passa a importar quando
 *  exercícios deixarem de vir só do próprio agente. */
const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Markdown mínimo do enunciado: blocos de código, inline code, títulos e negrito. */
export function renderDesc(text: string) {
  return escapar(text)
    .replace(/```python([\s\S]*?)```/g,
      '<pre style="background:var(--bg-card);border:1px solid var(--border-lit);border-radius:6px;padding:12px 14px;margin:10px 0;overflow-x:auto;font-family:var(--f-mono);font-size:12px;color:var(--text);line-height:1.6;white-space:pre">$1</pre>')
    .replace(/`([^`]+)`/g,
      '<code style="font-family:var(--f-mono);font-size:12px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;color:var(--cyan)">$1</code>')
    .replace(/^## (.+)$/gm,
      '<h2 style="font-family:var(--f-display);font-size:15px;font-weight:700;color:var(--text);margin:20px 0 8px">$1</h2>')
    .replace(/^### (.+)$/gm,
      '<h3 style="font-family:var(--f-display);font-size:13px;font-weight:600;color:var(--muted);margin:14px 0 6px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
    .replace(/\n/g, '<br/>')
}

export interface TestCase {
  id: number; description: string; input: string; expected: string; visible: boolean
}

export interface ExerciseData {
  id: string; title: string; slug: string; difficulty: string
  description: string; stub: string; hints: string[]
  module: string; tags: string[]
  book_reference: string | null; test_cases: TestCase[]
}
