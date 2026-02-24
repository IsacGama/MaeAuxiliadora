import { appConfig } from './config';

export class HttpError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

const parseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const errorMessageFromPayload = (payload: unknown, fallback: string) => {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload === 'object' && payload !== null) {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (Array.isArray(maybeMessage) && maybeMessage.length > 0) {
      return String(maybeMessage[0]);
    }
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }

  return fallback;
};

export const fetchJson = async <T>(
  input: string,
  init?: RequestInit,
  options?: { timeoutMs?: number },
): Promise<T> => {
  const timeoutMs = options?.timeoutMs ?? appConfig.requestTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const payload = await parseBody(response);

    if (!response.ok) {
      throw new HttpError(
        response.status,
        errorMessageFromPayload(payload, `Erro HTTP ${response.status}`),
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(408, 'Tempo de requisição esgotado', null);
    }

    if (error instanceof Error) {
      throw new HttpError(0, error.message, null);
    }

    throw new HttpError(0, 'Falha de conexão', null);
  } finally {
    clearTimeout(timer);
  }
};
