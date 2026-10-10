const GEMINI_CHAT_COMPLETIONS_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MAX_FALLBACK_MODELS = 5;
const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

export function getGeminiModelCandidates(): string[] {
  const primaryModel = process.env.GEMINI_MODEL?.trim();
  if (!primaryModel) return [];

  const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model && model !== primaryModel);

  return [primaryModel, ...new Set(fallbackModels)].slice(0, MAX_FALLBACK_MODELS + 1);
}

export async function requestGeminiCompletion(
  requestInit: RequestInit,
): Promise<{ response: Response; model: string; errorDetail?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = getGeminiModelCandidates();
  if (!apiKey || models.length === 0) {
    throw new Error('GEMINI_API_KEY and GEMINI_MODEL must be configured.');
  }
  if (typeof requestInit.body !== 'string') {
    throw new Error('Gemini request body must be a JSON string.');
  }

  const payload = JSON.parse(requestInit.body) as Record<string, unknown>;
  const headers = new Headers(requestInit.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Content-Type', 'application/json');

  let lastFailure: { response: Response; model: string; errorDetail: string } | undefined;
  let rateLimitFailure: typeof lastFailure;

  for (const model of models) {
    const response = await fetch(GEMINI_CHAT_COMPLETIONS_URL, {
      ...requestInit,
      headers,
      body: JSON.stringify({ ...payload, model }),
      signal: AbortSignal.timeout(120000),
    });

    if (response.ok) return { response, model };

    const errorDetail = await response.text();
    const retryable = RETRYABLE_STATUSES.has(response.status);
    const failureResponse = new Response(errorDetail, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    const failure = { response: failureResponse, model, errorDetail };
    lastFailure = failure;

    console.error('Gemini model request failed:', {
      model,
      status: response.status,
      detail: errorDetail.slice(0, 500),
    });

    if (response.status === 429 && !rateLimitFailure) rateLimitFailure = failure;
    if (!retryable) return failure;
  }

  const failure = rateLimitFailure ?? lastFailure;
  if (!failure) throw new Error('Gemini request failed without a response.');
  return failure;
}
