export interface DiffStats {
  additions: number;
  deletions: number;
}

interface DiffLine {
  kind: 'add' | 'remove' | 'same';
  text: string;
}

const MAX_LCS_CELLS = 250_000;

export function createUnifiedDiff(relativePath: string, before: string, after: string): string {
  if (before === after) {
    return '';
  }

  const beforeLines = splitLine(before);
  const afterLines = splitLine(after);
  const diffLines = buildLineDiff(beforeLines, afterLines);
  const oldRange = formatRange(1, beforeLines.length);
  const newRange = formatRange(1, afterLines.length);
  const body = diffLines.map(formatDiffLine);
  return [
    `--- a/${relativePath}`,
    `+++ b/${relativePath}`,
    `@@ -${oldRange} +${newRange} @@`,
    ...body,
  ].join('\n');
}

export function getDiffStats(diff: string): DiffStats {
  const lines = diff.split('\n');

  return lines.reduce<DiffStats>(
    (stats, line) => {
      if (line.startsWith('+')) {
        stats.additions += 1;
      } else if (line.startsWith('-')) {
        stats.deletions += 1;
      }
      return stats;
    },
    { additions: 0, deletions: 0 },
  );
}

// 将字符串按行分割
function splitLine(value: string): string[] {
  if (value.length === 0) {
    return [];
  }
  return value.replace(/\r\n?/g, '\n').split('\n');
}

function buildLineDiff(beforeLines: string[], afterLines: string[]): DiffLine[] {
  // 如果行数太多，直接返回全量删除和全量添加
  if (beforeLines.length * afterLines.length > MAX_LCS_CELLS) {
    return [
      ...beforeLines.map((text) => ({ kind: 'remove' as const, text })),
      ...afterLines.map((text) => ({ kind: 'add' as const, text })),
    ];
  }

  const table = Array.from(
    { length: beforeLines.length + 1 },
    () => new Uint32Array(afterLines.length + 1),
  );

  for (let i = beforeLines.length - 1; i >= 0; i -= 1) {
    for (let j = afterLines.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        beforeLines[i] === afterLines[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const diffLines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  // 从左上角开始，向右下角遍历 优先保留相同的行
  while (i < beforeLines.length && j < afterLines.length) {
    if (beforeLines[i] === afterLines[j]) {
      diffLines.push({ kind: 'same', text: beforeLines[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      diffLines.push({ kind: 'remove', text: beforeLines[i] });
      i += 1;
    } else {
      diffLines.push({ kind: 'add', text: afterLines[j] });
      j += 1;
    }
  }

  // 如果 beforeLines 还有剩余，则添加删除操作
  while (i < beforeLines.length) {
    diffLines.push({ kind: 'remove', text: beforeLines[i] });
    i += 1;
  }

  // 如果 afterLines 还有剩余，则添加添加操作
  while (j < afterLines.length) {
    diffLines.push({ kind: 'add', text: afterLines[j] });
    j += 1;
  }

  return diffLines;
}

// 格式化范围
function formatRange(start: number, count: number): string {
  return count === 0 ? `${start - 1},0` : `${start},${count}`;
}

function formatDiffLine(line: DiffLine): string {
  if (line.kind === 'add') {
    return `+${line.text}`;
  }

  if (line.kind === 'remove') {
    return `-${line.text}`;
  }

  return ` ${line.text}`;
}
