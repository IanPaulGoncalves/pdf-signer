# GitHub Copilot Instructions - PDF Signer

## Visão Geral do Projeto

Este é um aplicativo web React/TypeScript para assinatura visual de documentos PDF, construído com tecnologias modernas. O projeto implementa um sistema completo de assinatura visual com autenticação de usuários, limitação de uso gratuito/premium e processamento local de PDFs.

**IMPORTANTE**: O aplicativo oferece assinatura visual/gráfica (inserção de imagem da assinatura no PDF), não assinatura digital certificada com validação criptográfica.

## Stack Tecnológico

### Frontend
- **React 18** com TypeScript
- **Vite** como bundler e dev server
- **TailwindCSS** para estilização
- **shadcn/ui** como biblioteca de componentes base
- **Radix UI** para componentes primitivos
- **React Hook Form** para gerenciamento de formulários
- **React Query** para gerenciamento de estado e cache
- **React Router** para navegação

### Backend & Banco de Dados
- **Supabase** para autenticação e banco de dados PostgreSQL
- **Supabase Functions** para edge functions (Edge Functions em TypeScript)

### Processamento de PDF
- **pdf-lib** para manipulação de PDFs
- **pdfjs-dist** para renderização e extração de texto
- **JSZip** para exportação em lotes

### Build & Deploy
- **Bun** como package manager
- **ESLint** para linting

## Estrutura de Pastas

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes shadcn/ui base
│   ├── AuthModal.tsx   # Modal de autenticação
│   ├── SignaturePad.tsx # Canvas para desenhar assinaturas
│   ├── PdfDropzone.tsx # Upload de arquivos PDF
│   └── ...
├── hooks/              # Custom React hooks
├── lib/                # Bibliotecas e utilitários
│   ├── pdfSign.ts      # Lógica de assinatura de PDF
│   ├── pdfRender.ts    # Renderização de PDF
│   └── utils.ts        # Utilitários gerais
├── pages/              # Páginas da aplicação
├── types.ts           # Definições de tipos TypeScript
└── integrations/      # Integrações externas
    └── supabase/      # Cliente e tipos Supabase
```

## Funcionalidades Principais

### 1. Assinatura de PDFs
- Upload múltiplo de arquivos PDF (drag & drop)
- Três tipos de assinatura:
  - **SignaturePad**: Desenho manual com canvas
  - **SignatureUpload**: Upload de imagem de assinatura
  - **SignatureText**: Assinatura textual tipográfica
- Posicionamento preciso da assinatura em páginas específicas
- Detecção automática de campos de assinatura via âncoras de texto

### 2. Sistema de Usuários
- Autenticação via Supabase (email/senha)
- Perfis de usuário com controle de uso
- Sistema freemium: 3 assinaturas gratuitas, premium ilimitado
- Reset de senha e confirmação de email

### 3. Interface do Usuário
- Fluxo multi-step: Documentos → Assinatura → Posicionar → Exportar
- Interface responsiva com TailwindCSS
- Componentes acessíveis com Radix UI
- Toasts e modais para feedback

## Padrões de Desenvolvimento

### TypeScript
- Usar types explícitos para todas as funções e componentes
- Definir interfaces para objetos complexos
- Utilizar os tipos definidos em `src/types.ts`
- Aproveitar os tipos auto-gerados do Supabase em `integrations/supabase/types.ts`

### React
- Componentes funcionais com hooks
- Props tipadas com interfaces
- Use `React.FC<Props>` para componentes
- Preferir `useCallback` e `useMemo` para otimização
- Estado local com `useState`, estado global via React Query

### Estilização
- Usar TailwindCSS classes
- Seguir o design system do shadcn/ui
- Responsividade mobile-first
- Usar variáveis CSS customizadas para cores (definidas no tema)

### Estrutura de Componentes
```tsx
interface ComponentProps {
  prop1: Type1;
  prop2: Type2;
  onAction?: (param: Type) => void;
}

export const Component: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  onAction
}) => {
  // hooks
  // handlers
  // render
};
```

## Regras Específicas de Negócio

### Sistema de Limitação
- Usuários free: máximo 3 assinaturas
- Usuários premium: assinaturas ilimitadas
- Verificar sempre `canSign()` antes de processar
- Incrementar contador após assinatura bem-sucedida

### Processamento de PDF
- Suporte apenas arquivos `.pdf`
- Validação de integridade do arquivo
- Coordenadas de assinatura: converter UI (top-left) para PDF (bottom-left)
- Manter proporção entre viewport e dimensões reais do PDF

### Estados dos Documentos
```typescript
type DocumentStatus = 
  | 'waiting'     // Aguardando processamento
  | 'processing'  // Sendo processado
  | 'auto-found'  // Campos encontrados automaticamente
  | 'review'      // Aguardando revisão do usuário
  | 'signed'      // Assinado com sucesso
  | 'error';      // Erro no processamento
```

## Integrações

### Supabase
- Configuração em `src/integrations/supabase/client.ts`
- Tabelas: `profiles`, `purchases`
- RLS (Row Level Security) habilitado
- Políticas de acesso baseadas em `user_id`

### Hooks Customizados
- `useAuth`: Gerenciamento de autenticação e perfil
- `useSignatureLimit`: Controle de limitação de uso
- `use-mobile`: Detecção de dispositivos móveis

## Comandos Úteis

```bash
# Desenvolvimento
bun run dev          # Iniciar servidor de desenvolvimento
bun run build        # Build para produção
bun run build:dev    # Build para desenvolvimento
bun run lint         # Executar linting
bun run preview      # Preview da build

# Supabase (se configurado localmente)
supabase start       # Iniciar Supabase local
supabase db reset    # Reset do banco local
```

## Considerações de Performance

### PDF Processing
- Processar PDFs no lado cliente para privacidade
- Lazy loading de páginas PDF grandes
- Debounce em operações de renderização
- Web Workers para processamento pesado (quando necessário)

### React Optimization
- Memoização de componentes pesados com `React.memo`
- `useCallback` para handlers passados como props
- `useMemo` para cálculos complexos
- Lazy loading de rotas com `React.lazy`

## Debugging e Logs

### Desenvolvimento
- Console.error para erros de PDF
- Toast notifications para feedback ao usuário
- Error boundaries para captura de erros React
- Supabase logs para erros de backend

### Produção
- Evitar console.logs em produção
- Usar error tracking (se configurado)
- Logs estruturados em Edge Functions

## Convenções de Commit

- Usar conventional commits
- Prefixos: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`
- Commits em português ou inglês (consistente no projeto)

## Observações Importantes

1. **Privacidade**: PDFs são processados localmente, nunca enviados ao servidor
2. **Compatibilidade**: Testado em Chrome, Firefox, Safari e Edge modernos
3. **Mobile**: Interface responsiva, mas melhor experiência no desktop
4. **Limitações**: PDFs protegidos por senha não são suportados

---

**Lembre-se**: Este projeto prioriza experiência do usuário, privacidade dos documentos e simplicidade de uso. Mantenha essas diretrizes ao contribuir com o código.