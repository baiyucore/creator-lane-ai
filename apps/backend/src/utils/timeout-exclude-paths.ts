// 超时拦截器排除的路径（精确或包含匹配）
// 单独维护这个列表，方便后续统一调整和复用
export const TIMEOUT_EXCLUDE_PATHS: string[] = [
  '/metrics',
  '/health',
  '/favicon.ico',
  '/api-docs',
  '/ai/continue-writing',
  '/ai/embeddings',
  '/ai/question',
  '/ai/kb',
  '/ai/podcast',
  // 流式接口不设超时
  '/ai/agent/stream',
];
