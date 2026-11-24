import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { api, ApiError, setCurrentUserId } from '../../src/api/client';

/**
 * Axios lets us replace its "adapter" (the part that really sends the request).
 * The interceptors still run, so we can test them without any server.
 */
const respondWith = (handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) => {
  api.defaults.adapter = handler;
};

const ok = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> =>
  Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });

describe('api client', () => {
  afterEach(() => setCurrentUserId(null));

  it('uses the /api/v1 base URL', async () => {
    let url = '';
    respondWith((config) => {
      url = `${config.baseURL}${config.url}`;
      return ok(config);
    });

    await api.get('/resources');

    expect(url).toBe('/api/v1/resources');
  });

  it('sends the current user in the X-User-Id header', async () => {
    const seen: unknown[] = [];
    respondWith((config) => {
      seen.push(config.headers.get('X-User-Id'));
      return ok(config);
    });

    await api.get('/bookings/me');
    setCurrentUserId('user-student');
    await api.get('/bookings/me');

    expect(seen).toEqual([undefined, 'user-student']);
  });

  it('turns an API error body into an ApiError', async () => {
    respondWith((config) =>
      Promise.reject(
        new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: {},
          config,
          data: {
            status: 'error',
            code: 'QUOTA_EXCEEDED',
            message: 'A student cannot book more than 2 hours at a time.',
            timestamp: '2026-12-01T08:00:00.000Z',
          },
        }),
      ),
    );

    const error: unknown = await api.post('/bookings', {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'QUOTA_EXCEEDED',
      message: 'A student cannot book more than 2 hours at a time.',
    });
  });

  it('gives a readable message when the server cannot be reached', async () => {
    respondWith((config) =>
      Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config, {}, undefined)),
    );

    await expect(api.get('/resources')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the server. Is the backend running?',
    });
  });

  it('keeps a generic message when the error body is not in the API format', async () => {
    respondWith((config) =>
      Promise.reject(
        new AxiosError('Bad Gateway', 'ERR_BAD_RESPONSE', config, null, {
          status: 502,
          statusText: 'Bad Gateway',
          headers: {},
          config,
          data: '<html>proxy error</html>',
        }),
      ),
    );

    await expect(api.get('/resources')).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN_ERROR',
      message: 'Unexpected error (HTTP 502).',
    });
  });
});
