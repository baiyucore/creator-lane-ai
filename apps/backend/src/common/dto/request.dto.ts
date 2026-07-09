import { FastifyRequest } from 'fastify';

export interface IUser {
  id: number;
  github_id?: string; // 可选 github id
  name: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

// 扩展请求类型，包含用户信息
export type RequestWithUser = FastifyRequest & { user: IUser };

/** 请求中包含分享链接 */
export type RequestWithShareLink = FastifyRequest & {
  documentId: number;
  document?: any;
  shareLink?: any;
};
