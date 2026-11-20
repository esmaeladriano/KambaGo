// Supabase Edge Function: send-otp
// Executa no servidor apenas. Segredos nunca expostos ao cliente móvel.

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

const ANGOLAN_PHONE_REGEX = /^\+2449\d{8}$/;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { phone?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!ANGOLAN_PHONE_REGEX.test(phone)) {
    return new Response(
      JSON.stringify({ error: 'Número angolano inválido (+244 9XX XXX XXX).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const provider = Deno.env.get('SMS_PROVIDER') ?? 'pending';
  const apiKey = Deno.env.get('SMS_PROVIDER_API_KEY') ?? '';

  if (provider === 'pending' || !apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: 'pending_configuration',
        message: 'Provedor SMS para OTP em configuração pendente no servidor.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Integração concreta com Twilio ou Africa's Talking será ativada com as chaves no servidor.
  return new Response(
    JSON.stringify({
      ok: false,
      status: 'pending_configuration',
      message: `Provedor ${provider} aguarda ativação final.`,
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
});
