# FinanCasa

Aplicativo local de gestão financeira pessoal construído com **Electron** e interface em HTML/CSS/JS.

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

## Execução em desenvolvimento

```bash
npm start
```

## Build desktop

```bash
npm run build
```

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

O app Electron não deve ser usado como Web Service no Render, porque `npm start` abre uma janela desktop. Para hospedagem web, publique a versão estática.

## Banco de dados Supabase

O app sincroniza o estado financeiro na tabela `financasa_state` do Supabase e mantém um cache local quando estiver offline.

1. Abra o SQL Editor do Supabase.
2. Execute o script `database/supabase-schema.sql`.
3. Rode o app normalmente:

```bash
npm start
```

Variáveis opcionais para trocar projeto/registro sem alterar código:

```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
FINANCASA_STATE_ID=default
```

Nunca coloque `service_role` ou secret keys no app desktop. Se essas chaves forem expostas, rotacione no painel do Supabase.

## Estrutura atual

- `main.js`: processo principal do Electron
- `preload.js`: camada de isolamento para APIs seguras
- `index.html`: interface e lógica do app
- `database/supabase-schema.sql`: tabela e políticas de acesso do Supabase

## Segurança (desktop)

A janela Electron foi configurada com:

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- bloqueio de navegação externa na janela principal

## Observações

- Os dados são sincronizados com Supabase e também mantidos em cache local no diretório de dados do app.
- Recomenda-se evolução para modularização do front-end e sanitização centralizada de conteúdo renderizado.
