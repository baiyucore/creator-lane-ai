// import { readFile } from 'node:fs/promises';
// import path from 'node:path';

// const CONTEXT_FILES = [
//   'AGENTS.md',
//   'package.json',
//   'turbo.json',
//   'apps/backend/package.json',
//   'apps/frontend/package.json',
// ];
// const MAX_CONTEXT_CHARS = 12_000;

// export async function buildAgentWorkspaceContext(workspaceRoot: string): Promise<string>{
//   const sections: string[] = [];

//   for (const filePath of CONTEXT_FILES) {
//     const content = await readFile(path.join(workspaceRoot, filePath), 'utf-8').catch(() => null);
//     if (content === null) {
//       continue;
//     }
//     sections.push(`## ${filePath}\n${trimForContext(content, 2_400)}`);
//   }
//   return sections.join('\n\n');
// }
