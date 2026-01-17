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

- 🎯 **Campos Inteligentes (NOVO):**
  - Detecção automática de campos de assinatura em PDFs
  - Busca por palavras-chave como "assinatura", "responsável", "testemunha"
  - Palavras-chave personalizáveis pelo usuário
  - Economia de tempo no posicionamento de assinaturas

- 📄 **Recursos do aplicativo:**
  - Processamento 100% local (seus PDFs nunca saem do seu dispositivo)
  - Upload múltiplo de documentos (até 20 arquivos)
  - Posicionamento preciso da assinatura
  - Exportação individual ou em lote (ZIP)
  - Interface responsiva para desktop e mobile

- 👤 **Sistema de usuários:**
  - Contas gratuitas: 3 assinaturas por conta
  - Contas premium: assinaturas ilimitadas
  - Autenticação segura via Supabase

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
