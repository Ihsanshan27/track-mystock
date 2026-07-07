export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export function errorResponse(code: string, message: string, details?: unknown) {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  };
}
