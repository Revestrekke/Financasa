# Análise técnica do projeto FinanCasa

Data da análise: 2026-04-30

## Principais falhas identificadas

### 1) Risco de segurança no Electron (janela sem hardening explícito)
- A `BrowserWindow` é criada sem declarar `contextIsolation`, `sandbox` e `nodeIntegration` explicitamente. Mesmo que alguns defaults atuais do Electron possam ajudar, deixar isso implícito aumenta risco em upgrades e regressões de segurança.
- Também não há `preload` para isolar APIs nem política de navegação externa.
- Arquivo: `main.js`.

**Impacto:** potencial aumento da superfície de ataque (principalmente se no futuro houver conteúdo remoto, plugins de terceiros ou uso de `shell/openExternal`).

**Recomendação:** configurar explicitamente `webPreferences` com `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, usar `preload` e bloquear navegação inesperada.

---

### 2) Caminho incorreto para a página inicial no Electron
- O app carrega `index.html` na raiz e a interface também está na raiz.
- Arquivo: `main.js`.

**Impacto:** falha de inicialização da interface no desktop (tela em branco/erro de arquivo não encontrado), dependendo da estrutura de execução.

**Status:** corrigido para carregar `index.html` diretamente.

---

### 3) Dependências infladas e gerenciamento incorreto entre `dependencies` e `devDependencies`
- O `package.json` contém centenas de pacotes que parecem transitivos de build/runtime sendo declarados diretamente em `dependencies`.
- Para um app Electron simples, isso aumenta acoplamento, superfície de vulnerabilidades e custo de manutenção.

**Impacto:** maior probabilidade de CVEs, lockfile mais instável, instalação mais lenta e dificuldade de atualização.

**Recomendação:** manter apenas dependências diretas realmente usadas; mover ferramentas para `devDependencies`; regenerar lockfile com conjunto mínimo.

---

### 4) Falta de validação/sanitização antes de inserir dados com `innerHTML`
- O app injeta vários campos vindos do estado (incluindo entradas do usuário como descrição/tags/nome de conta/meta) via template string em `innerHTML`.
- Isso ocorre em múltiplos pontos de renderização da UI.
- Arquivo: `index.html` (script inline).

**Impacto:** risco de XSS persistente local (armazenado em `localStorage`) e quebra de layout/comportamento com caracteres especiais.

**Recomendação:** preferir `textContent` e criação de nós DOM com `createElement`; quando necessário, sanitizar dados antes de interpolar HTML.

---

### 5) Documentação do repositório com codificação inválida para uso comum
- `README.md` está em UTF-16 LE com BOM, contendo conteúdo mínimo.

**Impacto:** baixa legibilidade em ferramentas padrão, indexação ruim, onboarding prejudicado.

**Recomendação:** converter para UTF-8 e documentar setup, scripts, arquitetura e roadmap de segurança.

---

### 6) Arquitetura monolítica no front-end (manutenção difícil)
- CSS + HTML + lógica JS extensa estão todos no mesmo arquivo `index.html`.

**Impacto:** queda de produtividade, dificuldade de testes, maior chance de regressões e conflitos de mudanças.

**Recomendação:** modularizar em arquivos separados (`/src/js`, `/src/css`), extrair funções puras e introduzir testes de unidade para regras financeiras.

---

### 7) Regra de negócio potencialmente problemática ao “limpar todas” transações
- A função `limparTodas()` zera o saldo de todas as contas diretamente.

**Impacto:** perda de consistência histórica (saldo inicial vs. saldo derivado), podendo destruir dados financeiros esperados pelo usuário.

**Recomendação:** manter saldo inicial por conta e recalcular saldo com base em transações, em vez de zerar valores permanentemente.

## Check técnico executado
- `npm audit --json` não pôde ser concluído no ambiente por retorno `403 Forbidden` do endpoint de advisories do npm.

## Priorização sugerida (ordem)
1. Corrigir hardening do Electron + caminho de `loadFile`.
2. Reduzir dependências diretas no `package.json`.
3. Mitigar XSS (`innerHTML` + sanitização).
4. Separar frontend em módulos e adicionar testes de regra de negócio.
5. Reescrever `README.md` em UTF-8 com documentação útil.
