# AGENT.md — Agente Diário

**Horário:** 06:00 (diário)
**Status:** `[done]` — Task Scheduler configurado em 2026-06-04
**Última execução:** nunca (primeira execução: 2026-06-05 06:00)

---

## O que o agente faz

A cada execução às 6h, o agente:

1. **Lê o estado do aluno**
   - `study-backend/student/profile.md` — lacunas ativas e pontos fortes
   - Últimas 3 sessões em `study-backend/student/sessions/`
   - Plataforma: `get_context()`, `get_progress()` e `get_analytics()` via MCP

2. **Calibra a geração**
   - 0 exercícios nos últimos 3 dias → 1 exercício de reengajamento (dificuldade baixa, prazer alto)
   - Atividade normal → 2 exercícios alinhados com próxima lacuna do roadmap
   - Alta atividade (5+/dia) → 3 exercícios, aumentar dificuldade gradualmente

3. **Gera exercícios**
   - `create_exercise()` — entra direto no banco, visível na hora
   - Referência ao livro relevante quando aplicável

4. **Atualiza o perfil e o dashboard**
   - `update_profile()` / `add_profile_note()` com o que observou
   - `write_insight()` com a mensagem do dia
   - Atualiza este arquivo (AGENT.md) com timestamp da última execução

---

## Protocolo de falha

Se o MCP não estiver conectado ou as tools falharem:
- Registra a falha neste arquivo com timestamp
- **Não** tenta em loop, e **não** inventa dados de progresso
- Na próxima execução, começa do zero lendo `get_context()`

---

## Histórico de execuções

| Data | Exercícios gerados | Status | Notas |
|------|--------------------|--------|-------|
| 2026-06-08 06:00 | 1 exercício | ok | gaps: python:functions (*args), fase: 1, reengajamento (0 atividade) |

---

## Configuração

O agente roda via Claude Code `/schedule` e fala com a plataforma pelo MCP `devgrind`
(token pessoal gerado em Config). Como o Worker está na edge, não depende de nenhum
servidor local ligado.

```
claude mcp add --transport http devgrind <url-do-worker>/mcp
```
