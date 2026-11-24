import axios, { AxiosError } from 'axios';
import { ApiErrorBody } from './types';

/** Every failed API call rejects with this error: one shape for the whole UI. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** One shared Axios instance; components never call axios directly. */
export const api = axios.create({ baseURL: '/api/v1' });

// Set by the user picker. Module-level, so the interceptor can read it on every request.
let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  currentUserId = id;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

// Request interceptor: adds the authentication header to every call, in one place.
api.interceptors.request.use((config) => {
  if (currentUserId) {
    config.headers.set('X-User-Id', currentUserId);
  }
  return config;
});

// Response interceptor: turns every failure into an ApiError with a readable message.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the backend running?');
    }
    const status = error.response.status;
    // `unknown`, not `any`: we must prove the shape before reading it.
    const data: unknown = error.response.data;
    if (isApiErrorBody(data)) {
      return new ApiError(status, data.code, data.message);
    }
    return new ApiError(status, 'UNKNOWN_ERROR', `Unexpected error (HTTP ${status}).`);
  }
  return new ApiError(0, 'UNKNOWN_ERROR', 'Unexpected error.');
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    'message' in data &&
    typeof data.code === 'string' &&
    typeof data.message === 'string'
  );
}
