# CLAUDE.md — Arquiteto da DevGrind

> Este arquivo é carregado automaticamente a cada sessão. É a única fonte de verdade
> sobre COMO trabalhar. O estado real do projeto está no código e no `git log`.

---

## MISSÃO

Construir uma plataforma de aprendizado de backend para João — um único usuário com
TDAH que está aprendendo Python/FastAPI/SQL/HTTP para entender o ZionHub (seu projeto
em produção, vibecoded com IA).

A plataforma tem **dois tracks separados**:

### Track 1 — Cursos (estilo Duolingo)
Conteúdo estruturado baseado nos livros de `study-backend/books/`. Cada lição é um
capítulo com texto + exercícios práticos atrelados. Progressão linear por fase do
roadmap. O aluno avança módulo a módulo.

### Track 2 — Prática (estilo CodeWars, adaptativo)
Exercícios avulsos com execução real no browser (Pyodide). O diferencial é o motor
adaptativo: a IA analisa o desempenho por conceito e calibra a próxima leva.

**Foco de conteúdo:** exercícios de BACKEND — HTTP, SQL, FastAPI, arquitetura,
Python para backend. Não kata de algoritmos. Não puzzles. Problemas reais de
desenvolvimento backend.

**O CodeWars API** serve apenas para contexto: saber o que João já resolveu lá
para não repetir e entender seu nível. Não é para copiar exercícios do CodeWars.

**O objetivo final:** João entender o ZionHub titim por titim, sem depender de IA
para saber o que está acontecendo no próprio código.

---

## STACK

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Backend | Cloudflare Workers + Hono + D1 | Um só backend, deploy na edge |
| ORM | Drizzle | SQL tipado, roda no Workers |
| Storage | R2 (PDFs, capas, texto extraído) | Sem disco local |
| Frontend | React 19 + Vite + TypeScript | SPA simples |
| Editor | Monaco Editor | Mesmo do VS Code |
| Execução de código | Pyodide (Python no browser) | Sem servidor de execução |
| Fonte tipográfica | JetBrains Mono (única fonte) | Dev tool aesthetic, sem Syne/Outfit |
| Auth | Google OAuth + dev bypass | Zero fricção |
| Agente | Claude Code /schedule (diário, 6h) | Usa conta do usuário, sem API key no backend |
| Conteúdo | study-backend/ (21 livros, perfil, quizzes) | Fonte de verdade do conteúdo |

---

## ESTRUTURA DE ARQUIVOS

```
devgrind/
├── CLAUDE.md               ← este arquivo (arquiteto)
├── README.md               ← stack, setup local, deploy
├── docs/superpowers/       ← specs/ e plans/ (AAAA-MM-DD-<tema>.md)
├── study-backend/          ← conteúdo fonte, repo separado (gitignored) — NÃO MODIFICAR estrutura
│   ├── CLAUDE.md           ← instruções do mentor socrático
│   ├── books/              ← 21 livros em MD (Python, FastAPI, SQL, etc.)
│   ├── memory/             ← perfil do aluno, roadmap, feedback
│   ├── quizzes/            ← provas diagnósticas já feitas
│   └── student/            ← perfil dinâmico + sessões
├── platform/
│   ├── worker/             ← Hono + D1 (porta 8787) — ÚNICO backend
│   │   ├── src/
│   │   │   ├── index.ts    ← registro de rotas
│   │   │   ├── db/         ← schema.ts (Drizzle), index.ts
│   │   │   ├── lib/        ← tools.ts (registry MCP+chat), honor, rank, progress
│   │   │   ├── middleware/ ← auth.ts (JWT)
│   │   │   └── routes/     ← auth, exercises, submissions, books, store, mcp, chat…
│   │   └── drizzle/        ← migrations
│   └── frontend/           ← React + Vite (porta 5173)
│       └── src/
│           ├── pages/      ← Dashboard, Courses, Exercise, Books, Store, Chat, Profile, Config, Login…
│           ├── components/ ← layout/ (Sidebar icon rail 60px, AppLayout), SkillPath…
│           ├── hooks/      ← usePyodide
│           └── auth/       ← AuthContext
└── agent/
    ├── AGENT.md            ← estado do agente + histórico de execuções
    ├── daily_prompt.md     ← prompt completo que o /schedule executa
    └── codewars_sync.py    ← lê perfil público JohnGabie via API CodeWars
```

---

## COMO O AGENTE ADAPTATIVO FUNCIONA

O agente NÃO valida exercícios em tempo real. Opera em ciclos assíncronos:

```
Rodada de exercícios
    ↓ (Pyodide valida se código passou/falhou)
Submission salva no banco com: status, test_results, time_spent, concepts
    ↓
Agente executa diariamente às 6h via /schedule
    ↓
Conecta no MCP da plataforma (/mcp, token pessoal)
    ↓
Chama: get_context() e get_profile()  → rank, streak, lacunas, estilo
Lê: study-backend/memory/user_perfil.md  → quem é o aluno
Lê: study-backend/memory/project_roadmap.md  → onde está no roadmap
Lê: codewars_sync.py output  → o que já resolveu no CodeWars
    ↓
Analisa: quais conceitos têm taxa < 60%? o que veio da sessão anterior?
    ↓
Cria: 1-3 exercícios via create_exercise() — já entram no D1
Atualiza: update_profile() / add_profile_note() / write_insight() (mensagem do dia)
Registra: agent/AGENT.md com timestamp e o que foi gerado
```

**Calibração de quantidade:**
- 0 exercícios nos últimos 3 dias → 1 exercício fácil (reengajamento)
- Atividade normal → 2 exercícios nos gaps identificados
- Alta atividade (5+/dia) → 3 exercícios, dificuldade cresce

**Conceitos rastreados** (campo `concepts` em cada exercício):
```
python:types, python:functions, python:async, python:oop
http:methods, http:status-codes, http:headers, http:rest
sql:select, sql:joins, sql:aggregations, sql:transactions
fastapi:routing, fastapi:pydantic, fastapi:auth, fastapi:middleware
arch:separation-of-concerns, arch:error-handling, arch:naming
```

---

## PROTOCOLO DE TRABALHO

### Spec antes de código
Feature ou mudança de comportamento exige spec curta em `docs/superpowers/specs/`: pedido
nas palavras do João, leitura do pedido, propostas suas marcadas "não decidido", fora do escopo.
Escreveu a spec, PARE e peça aprovação. Pedido original ou silêncio não é aprovação.
Spec errada no meio do caminho: pare, atualize e peça aprovação do trecho.
Não exige spec: typo, formatação, doc, bug de causa óbvia e local.

### Ao iniciar uma tarefa
1. Leia a spec ou a task — entenda o critério de conclusão antes de começar
2. Se depende de outra não concluída, pare e sinalize
3. Escreva o código mínimo que satisfaz o critério. Nada além.
4. Voltando de pausa: liste em uma linha as branches paradas e sugira terminar, fatiar
   ou descartar antes de abrir outra. Se o João quiser ir direto, siga.

### Modelos e subagentes
- Opus: decisão ambígua, arquitetura, auth, dados, e toda revisão de código.
- Sonnet: escopo claro, lógica nova em vários arquivos. Haiku: tarefa mecânica.
- Um agente = uma preocupação, arquivos distintos; contrato (rota, tipo, schema) na spec.
- Quem integra roda typecheck e testes de novo. Agente que falhou = nada entregue.

### Quando algo quebra
Reproduza primeiro. Leia logs, resposta HTTP e D1 antes de perguntar. Ache a causa
raiz e só então corrija. Explique a causa em uma frase para o João.

### Ao concluir uma tarefa
1. Worker: `npx tsc --noEmit` e `npm test`. Frontend, se tocou: `npm run build` e `npm test`.
   Verde, com exit code conferido, antes de dizer que acabou. Não filtre saída escondendo falha.
2. Bug corrigido ganha teste que falha antes e passa depois. Regra nova: quebre o código
   de propósito, veja o teste nomeado falhar, restaure.
3. Mexeu em tela: abra no navegador e passe pelos estados vazio, erro e com dados.
4. Diga o que rodou e o que viu. O que não rodou é "não verificado".
5. Se a decisão muda arquitetura: registre na spec da feature.

### Autocommit
Autorizado: commite sem perguntar quando uma unidade de trabalho estiver pronta. Nunca faça push.
1. **Pronta** = faz uma coisa só, typecheck e testes do que tocou verdes. Quebrado ou pela metade não se commita.
2. **Atômico**: um motivo por commit. Misturou feature, fix e docs, separe.
3. **Só em branch de trabalho** (`feat/…`, `fix/…`). Nunca em `main`; em `dev` só se o usuário pedir.
4. **Stage explícito** por caminho. Sem `git add -A`/`.`. Fora do commit: segredos, `.env`, `.dev.vars`, `node_modules`, artefatos de build, screenshots e arquivos que o usuário editou à mão sem relação com a tarefa.
5. **Mensagem**: imperativo, português, resume o porquê em ≤ 72 caracteres, no estilo do `git log`. Corpo só se o porquê não for óbvio.
6. **Histórico é do usuário**: sem `--amend`, `--no-verify`, `reset --hard`, `push --force`. Hook falhou, corrija a causa e faça um commit novo.
7. Diga o hash e a mensagem ao final.

### Quando bloqueado
Diga o que falta e por quê, em vez de inventar solução que aumenta acoplamento.

---

## PRINCÍPIOS DE CÓDIGO

1. **Mínimo que funciona** — sem abstrações para "futuro"
2. **Um arquivo por responsabilidade** — router, service, model separados
3. **Sem comentários óbvios** — nome de função já documenta
4. **Estado nunca em memória** — tudo no banco
5. **Zero dependência de context window** — os arquivos contam tudo

---

## ANTI-PADRÕES

- ❌ Exercícios de algoritmo puro (ordenação, busca binária) — foco é backend
- ❌ Validação de resposta em tempo real por IA — agente opera em batch
- ❌ Guardar chave de IA no backend — o agente usa /schedule; o chat recebe a chave do usuário por request
- ❌ Criar um segundo backend — o Worker é a única implementação do domínio
- ❌ Copiar exercícios do CodeWars — CodeWars API é só para contexto de perfil
- ❌ Modificar `study-backend/` exceto `student/profile.md` via agente
- ❌ Usar Syne, Outfit ou qualquer fonte que não seja JetBrains Mono
- ❌ Dizer que terminou sem rodar typecheck e testes
- ❌ Começar a implementar na mesma resposta em que escreveu a spec
- ❌ Repassar "testes passaram" de um subagente sem ter rodado de novo
- ❌ Confiar na conversa para reconstruir contexto — sempre leia os arquivos
