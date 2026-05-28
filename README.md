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
- Start Command: `npm start` ou `node main.js`

Para evitar a tela de erro antiga, faça deploy do commit mais recente da branch `main`.

## Banco de dados Supabase

O app usa Supabase Auth e sincroniza os dados em uma área financeira compartilhada. A estrutura atual cria perfis, áreas, membros e políticas RLS para que usuários convidados acessem a mesma base de dados da sua área.

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

## Usuários e acesso

Para compartilhar sua área financeira:

1. A pessoa cria uma conta no FinanCasa com o próprio e-mail e senha.
2. Entre com seu usuário administrador.
3. Abra **Minha área > Adicionar Usuário**.
4. Informe o e-mail da pessoa e escolha a permissão.

Permissões:

- `Administrador`: gerencia usuários e edita dados.
- `Editor`: edita dados financeiros da área.
- `Visualizador`: acessa a área sem salvar alterações.

## Criar usuário admin

Crie o usuário pelo próprio app ou pelo painel do Supabase:

1. Em **Authentication > Users**, clique em **Add user**.
2. Defina o e-mail de login e uma senha forte.
3. Em User Metadata, use:

```json
{
  "name": "David",
  "role": "admin"
}
```

O app exibirá o nome `David` depois do login. A senha não deve ser salva no código ou no repositório.

## Estrutura atual

- `index.html`: interface e lógica do app
- `server.js`: servidor web para Render Web Service
- `scripts/build-web.js`: gera `web-dist/` e `config.js`
- `database/supabase-schema.sql`: tabelas, perfis, áreas compartilhadas e políticas de acesso do Supabase

## Observações

- Os dados são sincronizados exclusivamente com Supabase por usuário autenticado e área financeira compartilhada.
- Recomenda-se evolução para modularização do front-end e sanitização centralizada de conteúdo renderizado.
