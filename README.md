# PDF Signer - Assinatura Visual de PDFs

Uma aplicação web moderna para adicionar assinaturas visuais a documentos PDF de forma local e privada.

## ⚠️ Importante: Tipo de Assinatura

**Este aplicativo oferece assinatura visual/gráfica, não assinatura digital certificada.**

- ✅ **Ideal para:** Documentos internos, formulários, contratos simples, situações onde não é necessária validação criptográfica
- ❌ **Não é adequada para:** Documentos oficiais que exigem certificação digital, transações bancárias, documentos legais que necessitam de verificação criptográfica

A assinatura é inserida como uma imagem no PDF, mantendo a privacidade dos seus documentos através do processamento local.

## Funcionalidades

- 🖊️ **Três tipos de assinatura visual:**
  - Desenho manual com canvas interativo
  - Assinatura tipográfica com fontes elegantes
  - Upload de imagem da sua assinatura

- 📄 **Recursos do aplicativo:**
  - Processamento 100% local (seus PDFs nunca saem do seu dispositivo)
  - Upload múltiplo de documentos (até 20 arquivos)
  - Posicionamento preciso da assinatura
  - Exportação individual ou em lote (ZIP)
  - Interface responsiva para desktop e mobile

## Como executar localmente

Para executar este projeto em sua máquina:

### Pré-requisitos

- [Node.js](https://nodejs.org/) ou [Bun](https://bun.sh/) instalado

### Instalação

```sh
# 1. Clone o repositório
git clone <URL_DO_SEU_REPOSITORIO>

# 2. Entre no diretório do projeto
cd pdf-signer

# 3. Instale as dependências
bun install
# ou: npm install

# 4. Configure as variáveis de ambiente
# Crie um arquivo .env com suas credenciais do Supabase

# 5. Execute o projeto em modo desenvolvimento
bun run dev
# ou: npm run dev
```

## Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** TailwindCSS + shadcn/ui + Radix UI
- **PDF:** pdf-lib + PDF.js
- **Build:** Vite + Bun

## Deploy

Este projeto pode ser facilmente deployed em plataformas como:
- [Vercel](https://vercel.com/)
- [Netlify](https://netlify.com/)
- [GitHub Pages](https://pages.github.com/)

## Licença

Este projeto está sob licença MIT.

## Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

**Desenvolvido com ❤️ para simplificar a assinatura de documentos PDF**
