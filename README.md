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

## Estrutura atual

- `main.js`: processo principal do Electron
- `preload.js`: camada de isolamento para APIs seguras
- `index.html`: interface e lógica do app

## Segurança (desktop)

A janela Electron foi configurada com:

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- bloqueio de navegação externa na janela principal

## Observações

- Os dados são persistidos localmente em arquivo JSON no diretório de dados do app.
- Recomenda-se evolução para modularização do front-end e sanitização centralizada de conteúdo renderizado.
