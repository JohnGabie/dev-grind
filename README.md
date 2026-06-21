# Vite + React + Hono + Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/vite-react-template)

Um template full-stack moderno para construir aplicações React com TypeScript, rodando diretamente na edge global da Cloudflare. Combina o melhor do ecossistema frontend com um backend leve e performático.

---

## Stack

| Camada | Tecnologia | Papel |
|---|---|---|
| Frontend | [React 19](https://react.dev/) | UI declarativa e reativa |
| Build | [Vite 7](https://vite.dev/) | Bundler ultrarrápido com HMR |
| Backend | [Hono](https://hono.dev/) | Framework web minimalista para Workers |
| Deploy | [Cloudflare Workers](https://developers.cloudflare.com/workers/) | Edge computing global |
| Linguagem | TypeScript | Tipagem estática em todo o projeto |

---

## Estrutura do Projeto

```
vite-react-template/
├── src/
│   ├── react-app/          # Aplicação React (frontend)
│   │   ├── App.tsx         # Componente raiz
│   │   ├── main.tsx        # Entry point do React
│   │   ├── App.css         # Estilos da aplicação
│   │   └── assets/         # SVGs e imagens estáticas
│   └── worker/
│       └── index.ts        # Worker Cloudflare + rotas Hono (backend)
├── public/                 # Arquivos estáticos públicos
├── index.html              # HTML raiz
├── wrangler.json           # Configuração do Cloudflare Workers
├── vite.config.ts          # Configuração do Vite
└── tsconfig.json           # Configuração do TypeScript
```

### Como funciona

O projeto roda em um único Cloudflare Worker que serve duas coisas:

1. **Assets estáticos** — o build do React (`dist/client/`) é servido pela Cloudflare como SPA, com suporte a client-side routing via `not_found_handling: single-page-application`.
2. **API** — rotas definidas com Hono em `src/worker/index.ts` respondem a chamadas `/api/*` diretamente na edge, sem cold start de servidor tradicional.

---

## Começando

### Pré-requisitos

- Node.js 18+
- Conta na [Cloudflare](https://dash.cloudflare.com/) (para deploy)

### Instalação

```bash
# Clonar o repositório
git clone <url-do-repo>
cd vite-react-template

# Instalar dependências
npm install
```

### Desenvolvimento local

```bash
npm run dev
```

A aplicação estará disponível em [http://localhost:5173](http://localhost:5173) com **Hot Module Replacement** ativo — qualquer mudança no código reflete instantaneamente no browser sem recarregar a página.

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com HMR |
| `npm run build` | Compila TypeScript e gera o bundle de produção |
| `npm run preview` | Serve o build de produção localmente para testes |
| `npm run deploy` | Faz deploy direto para o Cloudflare Workers |
| `npm run lint` | Roda o ESLint em todo o projeto |
| `npm run check` | Verifica tipos e simula o deploy (dry-run) |
| `npm run cf-typegen` | Gera tipos TypeScript para os bindings do Wrangler |

---

## Deploy

### Deploy para Cloudflare Workers

```bash
# Build + deploy em um único comando
npm run build && npm run deploy
```

Ou use os scripts separados:

```bash
npm run build   # Gera dist/
npm run deploy  # Envia para Cloudflare
```

### Monitoramento em tempo real

```bash
npx wrangler tail
```

Transmite logs do Worker em produção no terminal, útil para debugar requests e erros ao vivo.

---

## Adicionando rotas de API

O backend vive em `src/worker/index.ts`. Adicionar uma nova rota é simples:

```typescript
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Rota existente
app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// Nova rota
app.get("/api/users/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ id, name: "Joao" });
});

app.post("/api/items", async (c) => {
  const body = await c.req.json();
  return c.json({ created: body }, 201);
});

export default app;
```

O Hono suporta middlewares, agrupamento de rotas, validação, CORS e muito mais — consulte a [documentação oficial](https://hono.dev/docs).

---

## Bindings do Cloudflare Workers

Para usar recursos da Cloudflare (KV, D1, R2, AI, etc.), declare os bindings no `wrangler.json` e regenere os tipos:

```jsonc
// wrangler.json
{
  "kv_namespaces": [
    { "binding": "MY_KV", "id": "..." }
  ],
  "d1_databases": [
    { "binding": "DB", "database_id": "..." }
  ]
}
```

```bash
npm run cf-typegen   # Atualiza worker-configuration.d.ts
```

Os bindings ficam disponíveis via `c.env` nas rotas Hono:

```typescript
app.get("/api/data", async (c) => {
  const value = await c.env.MY_KV.get("chave");
  return c.json({ value });
});
```

---

## Configuração do Wrangler

```jsonc
// wrangler.json
{
  "name": "vite-react-template",
  "main": "./src/worker/index.ts",
  "compatibility_date": "2025-10-08",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },   // Logs e métricas automáticos
  "upload_source_maps": true,             // Stack traces legíveis em produção
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application"
  }
}
```

A flag `nodejs_compat` permite usar APIs do Node.js (como `crypto`, `buffer`) dentro do Worker.

---

## Recursos adicionais

- [Cloudflare Workers — Documentação](https://developers.cloudflare.com/workers/)
- [Vite — Guia](https://vitejs.dev/guide/)
- [React — Documentação](https://react.dev/)
- [Hono — Documentação](https://hono.dev/docs)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
