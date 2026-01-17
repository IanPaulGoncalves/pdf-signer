# Sistema de Feedback - Configuração

## Visão Geral

O sistema de feedback permite que os usuários enviem sugestões, reportem problemas ou enviem mensagens gerais diretamente do aplicativo. O feedback é armazenado no banco de dados e pode ser configurado para enviar emails.

## Funcionalidades

- ✅ Modal de feedback integrado no menu do usuário
- ✅ Três tipos de feedback: Sugestão, Problema/Bug e Outro
- ✅ Suporte para usuários autenticados e anônimos
- ✅ Armazenamento no banco de dados Supabase
- ✅ Interface responsiva e moderna
- 📧 Envio de email (requer configuração)

## Estrutura

### Componentes

- **FeedbackModal.tsx**: Modal principal com formulário de feedback
- **UserMenu.tsx**: Menu do usuário com botão "Enviar feedback"

### Edge Function

- **send-feedback**: Função Supabase que processa o feedback
  - Valida os dados recebidos
  - Armazena no banco de dados
  - Pode enviar email (requer configuração)

### Banco de Dados

Tabela `feedback` com:
- `id`: UUID (primary key)
- `user_id`: UUID (referência ao usuário, nullable)
- `type`: TEXT ('suggestion', 'bug', 'other')
- `message`: TEXT (mensagem do usuário)
- `email`: TEXT (email do usuário)
- `user_agent`: TEXT (informações do navegador)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Como Usar

### Para Usuários

1. Clique no menu do usuário (canto superior direito)
2. Selecione "Enviar feedback"
3. Escolha o tipo de feedback
4. Escreva sua mensagem
5. (Opcional) Adicione seu email se não estiver logado
6. Clique em "Enviar"

### Para Desenvolvedores

#### Acessar Feedback Armazenado

O feedback é armazenado na tabela `feedback` do Supabase. Para visualizar:

```sql
-- Ver todos os feedbacks
SELECT * FROM public.feedback ORDER BY created_at DESC;

-- Ver feedbacks por tipo
SELECT * FROM public.feedback WHERE type = 'bug' ORDER BY created_at DESC;

-- Ver feedbacks de usuários autenticados
SELECT f.*, p.email as user_email
FROM public.feedback f
LEFT JOIN public.profiles p ON f.user_id = p.user_id
WHERE f.user_id IS NOT NULL
ORDER BY f.created_at DESC;
```

Você pode acessar via:
- Supabase Dashboard → Table Editor → feedback
- SQL Editor no Supabase
- API do Supabase (com service_role key)

## Configuração de Email

### Opção 1: Resend (Recomendado)

1. Crie uma conta em [Resend](https://resend.com)
2. Obtenha sua API key
3. Configure o domínio para envio de emails
4. Adicione a API key como variável de ambiente no Supabase:
   ```bash
   # Via Supabase CLI
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
   
   # Ou via Dashboard
   # Settings → Edge Functions → Add secret
   ```
5. No arquivo `supabase/functions/send-feedback/index.ts`:
   - Descomente o código de envio de email (linhas comentadas)
   - Substitua `SEU_EMAIL_AQUI@exemplo.com` pelo seu email
   - Substitua `feedback@yourdomain.com` pelo email do seu domínio configurado no Resend

### Opção 2: SendGrid

```typescript
// Em supabase/functions/send-feedback/index.ts
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
  },
  body: JSON.stringify({
    personalizations: [{
      to: [{ email: FEEDBACK_EMAIL }],
      subject: emailSubject,
    }],
    from: { email: 'feedback@yourdomain.com' },
    content: [{
      type: 'text/plain',
      value: emailBody,
    }],
  }),
})
```

### Opção 3: Amazon SES

```typescript
// Requer biblioteca AWS SDK
import { SES } from 'https://esm.sh/@aws-sdk/client-ses'

const ses = new SES({
  region: 'us-east-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
})

await ses.sendEmail({
  Source: 'feedback@yourdomain.com',
  Destination: { ToAddresses: [FEEDBACK_EMAIL] },
  Message: {
    Subject: { Data: emailSubject },
    Body: { Text: { Data: emailBody } },
  },
})
```

## Adicionar Seu Email

O email onde você receberá os feedbacks é configurado via variável de ambiente `FEEDBACK_EMAIL`.

### No Supabase Dashboard (Recomendado)

1. Acesse seu projeto no Supabase
2. Vá em: **Settings → Edge Functions → Secrets**
3. Clique em "New Secret"
4. Configure:
   - **Name**: `FEEDBACK_EMAIL`
   - **Value**: `seu-email@gmail.com` (seu email real)
5. Clique em "Add"
6. Re-deploy a função:
   ```bash
   supabase functions deploy send-feedback
   ```

### Na Linha de Comando

Se tiver Supabase CLI linkado:
```bash
supabase secrets set FEEDBACK_EMAIL=seu-email@gmail.com
supabase functions deploy send-feedback
```

### Padrão

Se a variável não for configurada, o padrão é `feedback@example.com`.

## Deploy

### Supabase Cloud (Produção) - Recomendado

**Passo 1: Link ao seu projeto**
```bash
supabase link --project-ref seu-project-ref
```
(Substitua `seu-project-ref` pelo código do seu projeto no Supabase Dashboard → Settings → General)

**Passo 2: Push da migration (cria a tabela)**
```bash
supabase db push
```

**Passo 3: Deploy da Edge Function**
```bash
supabase functions deploy send-feedback
```

**Passo 4: Configurar variável de ambiente (seu email)**

No Supabase Dashboard:
1. Acesse: Settings → Edge Functions → Secrets
2. Clique em "New Secret"
3. Nome: `FEEDBACK_EMAIL`
4. Valor: `seu-email@gmail.com` (seu email real)
5. Clique em "Add"

### Supabase Local (Desenvolvimento)

### Supabase Cloud (Produção) - Recomendado

**Passo 1: Link ao seu projeto**
```bash
supabase link --project-ref seu-project-ref
```
(Substitua `seu-project-ref` pelo código do seu projeto no Supabase Dashboard → Settings → General)

**Passo 2: Push da migration (cria a tabela)**
```bash
supabase db push
```

**Passo 3: Deploy da Edge Function**
```bash
supabase functions deploy send-feedback
```

**Passo 4: Configurar variável de ambiente (seu email)**

No Supabase Dashboard:
1. Acesse: Settings → Edge Functions → Secrets
2. Clique em "New Secret"
3. Nome: `FEEDBACK_EMAIL`
4. Valor: `seu-email@gmail.com` (seu email real)
5. Clique em "Add"

### Supabase Local (Desenvolvimento)

```bash
# Aplicar migrations
supabase db reset

# Deploy da função
supabase functions deploy send-feedback

# Testar função
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-feedback' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "suggestion",
    "message": "Teste de feedback",
    "email": "teste@exemplo.com",
    "userId": null,
    "userAgent": "Test",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }'
```

### Via Supabase Dashboard

Se preferir sem usar CLI:

1. **Criar tabela**:
   - SQL Editor → Clique em "New Query"
   - Cole o conteúdo do arquivo `supabase/migrations/20260117122711_create_feedback_table.sql`
   - Clique em "Run"

2. **Deploy da função**:
   - Edge Functions → "Create a new function"
   - Nome: `send-feedback`
   - Cole o conteúdo do arquivo `supabase/functions/send-feedback/index.ts`
   - Clique em "Deploy"

3. **Adicionar secrets**:
   - Settings → Edge Functions → Add secret
   - Nome: `FEEDBACK_EMAIL`
   - Valor: seu email real

### Deploy Manual

Se não estiver usando deploy automático:
1. Faça push das mudanças para o repositório
2. Configure o secret `FEEDBACK_EMAIL` no Supabase Dashboard (conforme acima)

## Personalização

### Alterar Tipos de Feedback

Em `src/components/FeedbackModal.tsx`:

```typescript
type FeedbackType = 'suggestion' | 'bug' | 'feature' | 'other';

const getFeedbackTypeLabel = (type: FeedbackType) => {
  switch (type) {
    case 'suggestion': return 'Sugestão';
    case 'bug': return 'Reportar problema';
    case 'feature': return 'Nova funcionalidade';
    case 'other': return 'Outro';
  }
};
```

### Adicionar Campos Extras

1. Adicione ao formulário em `FeedbackModal.tsx`
2. Atualize interface `FeedbackRequest` na edge function
3. Adicione coluna na tabela `feedback` via migration

### Notificações em Tempo Real

Para receber notificações instantâneas:

```typescript
// Em um componente admin
const { data } = await supabase
  .from('feedback')
  .select('*')
  .order('created_at', { ascending: false })

supabase
  .channel('feedback-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'feedback'
  }, (payload) => {
    console.log('Novo feedback:', payload.new)
    // Enviar notificação, toast, etc.
  })
  .subscribe()
```

## Segurança

- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas para usuários autenticados e anônimos
- ✅ Validação de dados no servidor
- ✅ CORS configurado
- ✅ Rate limiting (considere adicionar)

### Adicionar Rate Limiting

Para prevenir spam, considere adicionar rate limiting:

```typescript
// Em send-feedback/index.ts
import { RateLimiter } from 'https://deno.land/x/rate_limiter@v1.0.0/mod.ts'

const limiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 requests por janela
})

// No handler
const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
if (!await limiter.check(clientIp)) {
  return new Response('Too many requests', { status: 429 })
}
```

## Troubleshooting

### Feedback não é enviado

1. Verifique o console do navegador para erros
2. Verifique os logs da Edge Function:
   ```bash
   supabase functions logs send-feedback
   ```
3. Confirme que a migration foi aplicada:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'feedback';
   ```

### Erro de permissão

- Verifique as políticas RLS na tabela `feedback`
- Confirme que o usuário tem permissão de INSERT

### Email não chega

- Verifique a configuração da API key do serviço de email
- Verifique os logs da Edge Function
- Teste o serviço de email separadamente
- Verifique spam/lixo eletrônico

## Próximos Passos

- [ ] Adicionar painel admin para visualizar feedbacks
- [ ] Implementar sistema de status (novo, lido, resolvido)
- [ ] Adicionar anexos de imagens/screenshots
- [ ] Criar sistema de resposta ao usuário
- [ ] Implementar analytics de feedback
- [ ] Adicionar categorização automática com IA

## Suporte

Para dúvidas ou problemas:
1. Verifique a documentação do Supabase
2. Consulte os logs das Edge Functions
3. Verifique o console do navegador
4. Revise este documento

---

**Nota**: Lembre-se de substituir `SEU_EMAIL_AQUI@exemplo.com` pelo seu email real antes de fazer deploy em produção!
