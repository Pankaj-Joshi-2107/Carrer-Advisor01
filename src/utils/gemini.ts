const GEMINI_CHAT_COMPLETIONS_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const RETRYABLE_STATUSES = new Set([401, 403, 404, 429, 500, 502, 503, 504]);

export function getGeminiApiKeyCandidates(): string[] {
  const keys = [
    process.env.GEMINI_API_KEY ?? '',
    ...(process.env.GEMINI_API_KEYS ?? '').split(','),
  ]
    .map((key) => key.trim())
    .filter(Boolean);
  return [...new Set(keys)];
}

export function hasGeminiCredentials(): boolean {
  return getGeminiApiKeyCandidates().length > 0 && Boolean(process.env.GEMINI_MODEL?.trim());
}

export function getGeminiModelCandidates(): string[] {
  const primaryModel = process.env.GEMINI_MODEL?.trim();
  if (!primaryModel) return [];

  const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model && model !== primaryModel);

  return [...new Set([primaryModel, ...fallbackModels])];
}

export async function requestGeminiCompletion(
  requestInit: RequestInit,
): Promise<{ response: Response; model: string; errorDetail?: string }> {
  const apiKeys = getGeminiApiKeyCandidates();
  const models = getGeminiModelCandidates();
  if (apiKeys.length === 0 || models.length === 0) {
    throw new Error('At least one Gemini API key and GEMINI_MODEL must be configured.');
  }
  if (typeof requestInit.body !== 'string') {
    throw new Error('Gemini request body must be a JSON string.');
  }

  const apiKey = apiKeys[0];
  const payload = JSON.parse(requestInit.body) as Record<string, unknown>;
  const headers = new Headers(requestInit.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Content-Type', 'application/json');

  let lastFailure: { response: Response; model: string; errorDetail: string } | undefined;
  let rateLimitFailure: typeof lastFailure;

  for (const model of models) {
    for (const [keyIndex, currentApiKey] of apiKeys.entries()) {
      headers.set('Authorization', 'Bearer ' + currentApiKey);
      const response = await fetch(GEMINI_CHAT_COMPLETIONS_URL, {
        ...requestInit,
        headers,
        body: JSON.stringify({ ...payload, model }),
        signal: AbortSignal.timeout(120000),
      });

      if (response.ok) {
        if (keyIndex > 0) {
          console.info('Gemini request succeeded with a fallback API key.', { model, keyIndex: keyIndex + 1 });
        }
        return { response, model };
      }

      const errorDetail = await response.text();
      const invalidApiKey = response.status === 400 &&
        /api[_ ]key.{0,40}(invalid|not valid)|invalid.{0,40}api[_ ]key/i.test(errorDetail);
      const retryable = RETRYABLE_STATUSES.has(response.status) || invalidApiKey;
      const failureResponse = new Response(errorDetail, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      const failure = { response: failureResponse, model, errorDetail };
      lastFailure = failure;

      console.error('Gemini model request failed:', {
        model,
        keyIndex: keyIndex + 1,
        status: response.status,
        detail: errorDetail.slice(0, 500),
      });

      if (response.status === 429 && !rateLimitFailure) rateLimitFailure = failure;
      if (!retryable) return failure;
    }
  }

  const failure = rateLimitFailure ?? lastFailure;
  if (!failure) throw new Error('Gemini request failed without a response.');
  return failure;
}
