export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryParams = Record<string, unknown> | URLSearchParams;
export type BodyParams = QueryParams | FormData;
export type RequestParams = BodyParams;

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ClientParams<P extends RequestParams = RequestParams> extends RequestOptions {
  params?: P;
  headers?: HeadersInit;
  signal?: AbortSignal;
  cacheTime?: number;
  withCredentials?: boolean;
}
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
export interface ApiResponse<T> {
  data: T;
  code?: number;
  message?: string;
  timestamp?: string;
}

export interface RequestResult<T> {
  data: ApiResponse<T> | null;
  error: string | null;
  status?: number;
}
type QueryRequestProps = ClientParams<QueryParams> & {
  url: string;
  method: 'GET' | 'DELETE';
};

type BodyRequestProps = ClientParams<BodyParams> & {
  url: string;
  method: Exclude<HttpMethod, 'GET' | 'DELETE'>;
};

type ClientRequestProps = QueryRequestProps | BodyRequestProps;

export class ClientRequest {
  constructor(
    private readonly baseUrl = '',
    private readonly options: RequestOptions = {},
  ) {}

  get<T>(url: string, params?: ClientParams<QueryParams>): Promise<RequestResult<T>> {
    return this.request<T>('GET', url, params);
  }

  private async request<T>(props: ClientRequestProps): Promise<RequestResult<T>> {
    try {
      const data = await this.execute<T>(props);

      return { data, error: null };
    } catch (error) {
      return this.toRequestResult<T>(error);
    }
  }
  private toRequestResult<T>(error: unknown): RequestResult<T> {
    if (error instanceof RequestError) {
      return { data: null, error: error.message, status: error.status };
    }

    if (this.isAbortError(error)) {
      return { data: null, error: '请求已取消' };
    }

    return { data: null, error: error instanceof Error ? error.message : '请求失败，请稍后重试' };
  }
  private isAbortError(error: unknown): error is DOMException {
    return error instanceof DOMException && error.name === 'AbortError';
  }
  private async execute<T>(props: ClientRequestProps): Promise<ApiResponse<T>> {
    const retries = props.retries ?? this.options.retries ?? 0;
    const retryDelay = props.retryDelay ?? this.options.retryDelay ?? 1000;

    return this.executeWithRetry(() => this.fetchOnce<T>(props), retries, retryDelay);
  }
  private async fetchOnce<T>(props: ClientRequestProps): Promise<ApiResponse<T>> {
    const timeout = props.timeout ?? this.options.timeout ?? 15000;
    const { url, init } = this.buildRequest(props);
    const response = await this.fetchWithTimeout(url, init, timeout, props.signal);

    return this.handleResponse<T>(response, url);
  }
}
