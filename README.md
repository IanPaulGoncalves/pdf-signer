# PDF Signer

Aplicacao web para inserir assinaturas visuais em PDFs com processamento local no navegador.

## Importante

Este app cria assinatura visual/grafica. Ele nao substitui assinatura digital certificada com validacao criptografica.

Use para documentos internos, formularios, contratos simples e fluxos em que uma marca visual seja suficiente. Para documentos oficiais ou operacoes que exigem certificado digital, use uma solucao certificada.

## Funcionalidades

- Upload de ate 20 PDFs por lote.
- Assinatura desenhada, digitada ou enviada como imagem.
- Deteccao inteligente de campos de assinatura por texto, linhas e secoes do PDF.
- Palavras-chave personalizadas para melhorar a deteccao.
- Multiplos campos de assinatura por documento.
- Rubrica visual em todas as paginas.
- Templates locais de posicionamento para reaproveitar layouts.
- Exportacao individual ou em ZIP.
- Preview do PDF assinado.
- Processamento local: arquivos nao sao enviados para servidores.

## Como executar

```sh
npm install
npm run dev
```

Tambem e possivel usar Bun:

```sh
bun install
bun run dev
```

## Tecnologias

- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui e Radix UI
- pdf-lib
- PDF.js
- JSZip

## Build

```sh
npm run build
```

## Licenca

MIT
