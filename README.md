# FinanCasa

SaaS web de gestão financeira familiar construído com HTML/CSS/JS, Supabase e Render.

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

## Execução em desenvolvimento

```bash
npm run build:web
npm start
```

Esse comando inicia a versão web local. O sistema é online-only: é necessário login no Supabase para carregar e salvar dados.

## Build web

```bash
npm run build:web
```

O build web gera os arquivos estáticos em `web-dist/`.

## Deploy no Render

Use o serviço **Static Site** do Render. O arquivo `render.yaml` já define:

- Build command: `npm ci && npm run build:web`
- Publish directory: `web-dist`
- Branch: `main`

Se você já criou um **Web Service** no Render, também funciona com:

- Build Command: `npm ci && npm run build:web`
- Start Command: `npm start`

Para evitar a tela de erro antiga, faça deploy do commit mais recente da branch `main`.

## Banco de dados Supabase

O app usa Supabase Auth e sincroniza o estado financeiro na tabela `financasa_state`. Cada usuário autenticado tem uma linha própria protegida por RLS.

1. Abra o SQL Editor do Supabase.
2. Execute o script `database/supabase-schema.sql`.
3. Em Authentication > URL Configuration, configure o Site URL com a URL do Render quando o deploy estiver criado.
4. Rode o app normalmente:

```bash
npm start
```

Variáveis opcionais para trocar projeto/registro sem alterar código:

```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

No Render, cadastre essas duas variáveis em **Environment**. Confira a URL em **Supabase > Project Settings > API > Project URL**.

Se o deploy abrir a tela de login mas não entrar/salvar, confira primeiro se `SUPABASE_URL` resolve corretamente. A URL deve ser exatamente a Project URL mostrada no painel do Supabase.

Nunca coloque `service_role` ou secret keys no app. Se essas chaves forem expostas, rotacione no painel do Supabase.

## Estrutura atual

- `index.html`: interface e lógica do app
- `server.js`: servidor web para Render Web Service
- `scripts/build-web.js`: gera `web-dist/` e `config.js`
- `database/supabase-schema.sql`: tabela e políticas de acesso do Supabase

## Observações

- Os dados são sincronizados exclusivamente com Supabase por usuário autenticado.
- Recomenda-se evolução para modularização do front-end e sanitização centralizada de conteúdo renderizado.
