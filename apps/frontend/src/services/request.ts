export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryParams = Record<string, unknown> | URLSearchParams;
export type BodyParams = QueryParams | FormData;
export type RequestParams = BodyParams;

// 请求选项
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// 请求参数
export interface ClientParams<P extends RequestParams = RequestParams> extends RequestOptions {
  params?: P;
  headers?: HeadersInit;
  signal?: AbortSignal;
  cacheTime?: number;
  withCredentials?: boolean;
}
// 请求错误
export class RequestError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status?: number,
    public readonly statusText?: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}
// 响应数据
export interface ApiResponse<T> {
  data: T;
  code?: number;
  message?: string;
  timestamp?: string;
}

// 请求结果
export interface RequestResult<T> {
  data: ApiResponse<T> | null;
  error: string | null;
  status?: number;
}
// 查询请求参数
type QueryRequestProps = ClientParams<QueryParams> & {
  url: string;
  method: 'GET' | 'DELETE';
};

// 请求参数
type BodyRequestProps = ClientParams<BodyParams> & {
  url: string;
  method: Exclude<HttpMethod, 'GET' | 'DELETE'>;
};

// 请求参数
type ClientRequestProps = QueryRequestProps | BodyRequestProps;

export class ClientRequest {
  constructor(
    private readonly baseUrl = '',
    private readonly options: RequestOptions = {},
  ) {}

  get<T>(url: string, params?: ClientParams<QueryParams>): Promise<RequestResult<T>> {
    return this.request<T>({ url, method: 'GET', ...params });
  }
  post<T>(url: string, params?: ClientParams<BodyParams>): Promise<RequestResult<T>> {
    return this.request<T>({ url, method: 'POST', ...params });
  }
  put<T>(url: string, params?: ClientParams<BodyParams>): Promise<RequestResult<T>> {
    return this.request<T>({ url, method: 'PUT', ...params });
  }
  patch<T>(url: string, params?: ClientParams<BodyParams>): Promise<RequestResult<T>> {
    return this.request<T>({ url, method: 'PATCH', ...params });
  }
  delete<T>(url: string, params?: ClientParams<QueryParams>): Promise<RequestResult<T>> {
    return this.request<T>({ url, method: 'DELETE', ...params });
  }

  createCancelToken(): { signal: AbortSignal; cancel: () => void } {
    const controller = new AbortController();
    return {
      signal: controller.signal,
      cancel: () => controller.abort(),
    };
  }

  // 请求
  private async request<T>(props: ClientRequestProps): Promise<RequestResult<T>> {
    try {
      // 执行请求
      const data = await this.execute<T>(props);

      return { data, error: null };
    } catch (error) {
      return this.toRequestResult<T>(error);
    }
  }
  // 转换请求结果
  private toRequestResult<T>(error: unknown): RequestResult<T> {
    if (error instanceof RequestError) {
      return { data: null, error: error.message, status: error.status };
    }

    if (this.isAbortError(error)) {
      return { data: null, error: '请求已取消' };
    }

    return { data: null, error: error instanceof Error ? error.message : '请求失败，请稍后重试' };
  }
  // 判断是否是AbortError
  private isAbortError(error: unknown): error is DOMException {
    return error instanceof DOMException && error.name === 'AbortError';
  }
  // 执行请求
  private async execute<T>(props: ClientRequestProps): Promise<ApiResponse<T>> {
    const retries = props.retries ?? this.options.retries ?? 0;
    const retryDelay = props.retryDelay ?? this.options.retryDelay ?? 1000;

    return this.executeWithRetry(() => this.fetchOnce<T>(props), retries, retryDelay);
  }
  // 执行一次请求
  private async fetchOnce<T>(props: ClientRequestProps): Promise<ApiResponse<T>> {
    const timeout = props.timeout ?? this.options.timeout ?? 15000;
    const { url, init } = this.buildRequest(props);
    const response = await this.fetchWithTimeout(url, init, timeout, props.signal);

    return this.handleResponse<T>(response, url);
  }
  // 构建请求
  private buildRequest(props: ClientRequestProps): { url: string; init: RequestInit } {
    const url = this.createUrl(props.url);
    const headers = new Headers(props.headers);
    let body: BodyInit | undefined;
    if (props.method === 'GET' || props.method === 'DELETE') {
      this.appendQueryParams(url, props.params);
    } else if (props.params) {
      if (props.params instanceof FormData || props.params instanceof URLSearchParams) {
        body = props.params;
      } else {
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        body = JSON.stringify(props.params);
      }
    }
    return {
      url: this.formatUrl(url),
      init: {
        method: props.method,
        headers,
        body,
        signal: props.signal,
        credentials: props.withCredentials ? 'include' : 'same-origin',
        ...(props.cacheTime !== undefined
          ? props.cacheTime > 0
            ? { next: { revalidate: props.cacheTime } }
            : { cache: 'no-store' as const }
          : { cache: 'no-store' as const }),
      },
    };
  }
  // 执行重试
  private async executeWithRetry<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    retries: number,
    retryDelay: number,
  ): Promise<ApiResponse<T>> {
    let attemptsLeft = retries;
    while (true) {
      try {
        return await requestFn();
      } catch (error) {
        if (
          attemptsLeft <= 0 ||
          this.isAbortError(error) ||
          (error instanceof RequestError && error.status && error.status < 500)
        ) {
          throw error;
        }
        await new Promise<void>((resolve) => setTimeout(() => resolve(), retryDelay));
        attemptsLeft -= 1;
      }
    }
  }
  // 追加查询参数 ( 给 get 和 delete 使用 )
  private appendQueryParams(url: URL, params?: QueryParams): void {
    if (!params) return;
    if (params instanceof URLSearchParams) {
      params.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
      return;
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          url.searchParams.append(key, String(item));
        });
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }
  // 创建url
  private createUrl(url: string): URL {
    // 如果url是完整的url，则直接返回
    if (/^https?:\/\//.test(url)) return new URL(url);
    // 如果baseUrl是完整的url，则直接返回
    if (/^https?:\/\//.test(this.baseUrl)) return new URL(`${this.baseUrl}/${url}`);
    // 否则拼接baseUrl和url
    const base = this.baseUrl.replace(/\/$/, '');
    const path = url.replace(/^\//, '');
    return new URL(`${base ? `${base}/` : ''}${path}`, 'http://request.local');
  }
  // 格式化url
  private formatUrl(url: URL): string {
    if (url.origin === 'http://request.local') return `${url.pathname}${url.search}`;
    return url.toString();
  }
  // 带超时处理的fetch
  private async fetchWithTimeout(
    url: string,
    init: RequestInit, // 请求初始化参数
    timeout: number,
    signal?: AbortSignal, // 可选的外部中断信号
  ): Promise<Response> {
    if (!timeout) return fetch(url, init);
    const controller = new AbortController(); // 取消请求的控制器
    let timeOut = false; // 标记是否超时
    // globalThis.setTimeout 是全局定时器，用于在指定时间后执行回调函数
    const timeoutId = globalThis.setTimeout(() => {
      timeOut = true;
      controller.abort();
    }, timeout);
    const onAbort = () => controller.abort();

    if (signal?.aborted) {
      onAbort();
    } else {
      signal?.addEventListener('abort', onAbort, { once: true });
    }

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (timeOut && this.isAbortError(error)) {
        throw new RequestError('请求超时', url, undefined, 'Timeout');
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  // 处理响应
  private async handleResponse<T>(response: Response, url: string): Promise<ApiResponse<T>> {
    if (!response.ok) {
      throw await this.createErrorResponse(response, url);
    }
    const contentType = response.headers.get('Content-Type');
    if (contentType?.includes('application/json')) {
      return { data: response as T };
    }
    let data: ApiResponse<T>;
    try {
      data = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new RequestError('解析响应数据失败', url, response.status, response.statusText);
    }
    if (data.code !== undefined && data.code !== 0 && (data.code < 200 || data.code >= 300)) {
      throw new RequestError(
        data.message || '请求失败',
        url,
        response.status,
        response.statusText,
        data,
      );
    }
    return data;
  }
  // 创建错误响应
  private async createErrorResponse(response: Response, url: string): Promise<RequestError> {
    const contentType = response.headers.get('Content-Type');
    let message = `HTTP 错误: ${response.status} ${response.statusText}`;
    let data: unknown;
    if (contentType?.includes('application/json')) {
      data = await response.json().catch(() => undefined);
      if (this.hasMessage(data)) message = data.message;
    }
    return new RequestError(message, url, response.status, response.statusText, data);
  }
  // 判断数据是否包含message
  private hasMessage(data: unknown): data is { message: string } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
    );
  }
}

const clientRequest = new ClientRequest(process.env.NEXT_PUBLIC_API_BASE_URL || '', {
  timeout: 15000,
  retries: 1,
  retryDelay: 1000,
});

export { clientRequest };
export default clientRequest;
