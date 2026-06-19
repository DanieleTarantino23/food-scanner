// Stub for @opentelemetry/api — Supabase imports it but never calls it in RN/web.
module.exports = {
  trace: { getTracer: () => ({ startSpan: () => ({ end: () => {}, setAttribute: () => {} }) }) },
  context: { with: (_ctx, fn) => fn(), active: () => ({}) },
  propagation: { inject: () => {}, extract: () => ({}) },
  SpanStatusCode: { OK: 1, ERROR: 2 },
  diag: { setLogger: () => {}, info: () => {}, warn: () => {}, error: () => {} },
};
