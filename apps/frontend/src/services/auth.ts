import { ClientRequest } from './request';

export async function logout() {
  return ClientRequest.post<{ success: boolean }>('/api/auth/logout');
}

export type AuthUser = {
  id: number;
  name: string;
  github_id?: string;
  email: string;
  avatar_url?: string;
};
