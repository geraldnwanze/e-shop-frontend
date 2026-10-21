/** Liveness probe for Docker/load balancers. Deliberately does not call the API. */
export function GET() {
  return Response.json({ ok: true });
}
