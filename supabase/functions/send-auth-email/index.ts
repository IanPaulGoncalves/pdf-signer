import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  email: string;
  type: 'confirmation' | 'reset';
  confirmationUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, confirmationUrl }: AuthEmailRequest = await req.json();

    let subject: string;
    let html: string;

    if (type === 'confirmation') {
      subject = "Confirme seu email - PDF Signer";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PDF Signer</h1>
          </div>
          <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin: 0 0 20px;">Bem-vindo! 🎉</h2>
            <p style="color: #4b5563; margin: 0 0 20px;">
              Você está a um passo de começar a assinar seus PDFs de forma rápida e segura.
            </p>
            <p style="color: #4b5563; margin: 0 0 30px;">
              Clique no botão abaixo para confirmar seu email e ativar sua conta:
            </p>
            <div style="text-align: center;">
              <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Confirmar meu email
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0; text-align: center;">
              Se você não criou esta conta, pode ignorar este email.
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0;">
            © 2025 PDF Signer. Todos os direitos reservados.
          </p>
        </body>
        </html>
      `;
    } else {
      subject = "Redefinir senha - PDF Signer";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PDF Signer</h1>
          </div>
          <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin: 0 0 20px;">Redefinir sua senha</h2>
            <p style="color: #4b5563; margin: 0 0 20px;">
              Recebemos uma solicitação para redefinir a senha da sua conta.
            </p>
            <p style="color: #4b5563; margin: 0 0 30px;">
              Clique no botão abaixo para criar uma nova senha:
            </p>
            <div style="text-align: center;">
              <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Redefinir senha
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0; text-align: center;">
              Se você não solicitou esta redefinição, pode ignorar este email.
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0;">
            © 2025 PDF Signer. Todos os direitos reservados.
          </p>
        </body>
        </html>
      `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PDF Signer <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Resend API error: ${errorData}`);
    }

    const emailResponse = await res.json();

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
