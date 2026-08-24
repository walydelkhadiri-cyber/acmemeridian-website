/* One origin, not a wildcard. This endpoint writes to a table and sends mail;
   any page on the internet being able to call it is exactly what we do not
   want. Localhost is here so the form can be worked on before it ships. */
const ALLOWED = new Set([
  'https://acmemeridian.com',
  'https://www.acmemeridian.com',
  'http://localhost:8877',
  'http://localhost:4321',
]);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.has(origin) ? origin : 'https://acmemeridian.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}
