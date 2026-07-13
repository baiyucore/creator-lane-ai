import ClientRequest, { clientRequest } from './request';

// 用户信息
export type AuthUser = {
  id: number;
  name: string;
  github_id?: string;
  email: string;
  avatar_url?: string;
};

export type EmailCodePayload = {
  email: string;
};

export type AuthSessionWithUser = {
  expires_in: number;
  refresh_expires_in: number;
  user: AuthUser;
};

// 获取 CSRF 头部
async function getCsrHeaders(): Promise<HeadersInit> {
  const result = await clientRequest.get<{ csrfToken: string }>('/security/csrf-token', {
    withCredentials: true,
  });
  const payload = result.data as ({ csrfToken: string } & typeof result.data) | null;
  const csrfToken = payload?.csrfToken ?? payload?.data?.csrfToken;

  return csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
}

// 登出
export async function logout() {
  return ClientRequest.post<{ success: boolean }>('/api/auth/logout', {
    headers: await getCsrHeaders(),
    withCredentials: true,
  });
}

export async function getCurrentUser() {
  return clientRequest.get<AuthUser>('/auth/me', { withCredentials: true });
}

// 发送邮箱验证码
export async function sendEmailCode(playload: EmailCodePayload) {
  return clientRequest.post<AuthSessionWithUser>('/auth/login/email-code', {
    headers: await getCsrHeaders(),
    withCredentials: true,
    params: playload,
  });
}

// 邮箱验证码登录
export async function loginWithEmailCode(playload: EmailCodePayload) {
  return clientRequest.post<AuthSessionWithUser>('/auth/login/email-code', {
    headers: await getCsrHeaders(),
    withCredentials: true,
    params: playload,
  });
}
// 获取 Github 登录 URL
export function getGithubLoginUrl(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

  return `${baseUrl}/auth/github`;
}
