import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, like, or } from 'drizzle-orm';

import { DrizzleService } from '@/common/drizzle/drizzle.service';
import { type WorkspaceFileModel, workspaceFiles, workspaces } from '@/schema';

import type { CreateWorkspaceItemDto } from './dto/create-workspace-item.dto';
import type { UpdateWorkspaceItemDto } from './dto/update-workspace-item.dto';

type TipTapContent = Record<string, unknown>;

type WorkspaceItemPayload = {
  id: string;
  kind: 'file' | 'folder';
  name: string;
  parentId: string | null;
  path: string;
  updatedAt: string;
  workspaceId: string;
};

type WorkspaceFileDocumentPayload = WorkspaceItemPayload & {
  content: TipTapContent | null;
  contentText: string;
};

type CreateAgentFileResult = {
  created: boolean;
  file: WorkspaceFileModel;
  nextText: string;
  previousText: string;
};

type ReplaceAgentFileResult = {
  file: WorkspaceFileModel;
  nextText: string;
  occurrences: number;
  previousText: string;
};

const DEFAULT_TIPTAP_DOC: TipTapContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

@Injectable()
export class WorksService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async listWorkspaces() {
    await this.ensureSeedData();

    const rows = await this.drizzleService.db
      .select()
      .from(workspaces)
      .orderBy(asc(workspaces.name));
    const fileRows = await this.drizzleService.db
      .select({
        workspaceId: workspaceFiles.workspaceId,
      })
      .from(workspaceFiles)
      .where(eq(workspaceFiles.kind, 'file'));

    const fileCountMap = new Map<string, number>();

    fileRows.forEach((row) => {
      fileCountMap.set(row.workspaceId, (fileCountMap.get(row.workspaceId) ?? 0) + 1);
    });

    return rows.map((row) => ({
      description: row.description,
      fileCount: fileCountMap.get(row.id) ?? 0,
      id: row.id,
      name: row.name,
      status: row.status,
      trackKey: row.trackKey,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getWorkspaceDetail(workspaceId: string) {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    const fileCountRows = await this.drizzleService.db
      .select({
        id: workspaceFiles.id,
      })
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.kind, 'file')));

    return {
      description: workspace.description,
      fileCount: fileCountRows.length,
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      trackKey: workspace.trackKey,
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  async listWorkspaceItems(workspaceId: string) {
    await this.getWorkspaceOrThrow(workspaceId);

    const rows = await this.drizzleService.db
      .select()
      .from(workspaceFiles)
      .where(eq(workspaceFiles.workspaceId, workspaceId))
      .orderBy(asc(workspaceFiles.path));

    return rows.map((row) => this.toWorkspaceItem(row));
  }

  async getWorkspaceFile(workspaceId: string, fileId: string) {
    const row = await this.getWorkspaceFileOrThrow(workspaceId, fileId);

    if (row.kind !== 'file') {
      throw new BadRequestException('当前条目不是文件，无法读取内容。');
    }

    const content = normalizeTipTapContent(row.content as TipTapContent | null);

    return {
      ...this.toWorkspaceItem(row),
      content,
      contentText: row.contentText ?? tipTapToPlainText(content),
    };
  }

  async createWorkspaceItem(workspaceId: string, dto: CreateWorkspaceItemDto) {
    await this.getWorkspaceOrThrow(workspaceId);

    const name = normalizeName(dto.name);
    const parent = dto.parentId
      ? await this.getWorkspaceFolderOrThrow(workspaceId, dto.parentId)
      : null;
    const path = buildPath(parent?.path, name);
    await this.assertPathAvailable(workspaceId, path);

    const content = dto.kind === 'file' ? normalizeTipTapContent(dto.content) : null;
    const contentText = dto.kind === 'file' ? tipTapToPlainText(content) : null;
    const now = new Date();

    const [created] = await this.drizzleService.db
      .insert(workspaceFiles)
      .values({
        content,
        contentText,
        kind: dto.kind,
        name,
        parentId: parent?.id ?? null,
        path,
        updatedAt: now,
        workspaceId,
      })
      .returning();

    return this.toWorkspaceItem(created);
  }

  async updateWorkspaceItem(workspaceId: string, fileId: string, dto: UpdateWorkspaceItemDto) {
    const target = await this.getWorkspaceFileOrThrow(workspaceId, fileId);

    if (dto.name == null && dto.content == null) {
      return this.toWorkspaceFileDocument(target);
    }

    if (target.kind === 'folder' && dto.content != null) {
      throw new BadRequestException('文件夹不支持写入内容。');
    }

    const nextName = dto.name != null ? normalizeName(dto.name) : target.name;
    const parentPath = target.parentId
      ? (await this.getWorkspaceFileOrThrow(workspaceId, target.parentId)).path
      : null;
    const nextPath = buildPath(parentPath, nextName);
    const now = new Date();

    return await this.drizzleService.db.transaction(async (tx) => {
      if (dto.name != null && nextPath !== target.path) {
        await this.assertPathAvailable(workspaceId, nextPath, target.id, tx);

        const [updatedRoot] = await tx
          .update(workspaceFiles)
          .set({
            name: nextName,
            path: nextPath,
            updatedAt: now,
          })
          .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.id, target.id)))
          .returning();

        if (target.kind === 'folder') {
          const descendants = await tx
            .select()
            .from(workspaceFiles)
            .where(
              and(
                eq(workspaceFiles.workspaceId, workspaceId),
                like(workspaceFiles.path, `${escapeLikePattern(target.path)}/%`),
              ),
            );

          const prefixLength = target.path.length;

          for (const child of descendants) {
            const suffix = child.path.slice(prefixLength);

            await tx
              .update(workspaceFiles)
              .set({
                path: `${nextPath}${suffix}`,
                updatedAt: now,
              })
              .where(eq(workspaceFiles.id, child.id));
          }
        }

        if (target.kind === 'folder' && dto.content == null) {
          return this.toWorkspaceFileDocument(updatedRoot);
        }

        const base = updatedRoot ?? target;
        const content =
          dto.content != null
            ? normalizeTipTapContent(dto.content)
            : normalizeTipTapContent(base.content as TipTapContent | null);
        const contentText = tipTapToPlainText(content);

        const [updatedFile] = await tx
          .update(workspaceFiles)
          .set({
            content,
            contentText,
            updatedAt: now,
          })
          .where(eq(workspaceFiles.id, target.id))
          .returning();

        return this.toWorkspaceFileDocument(updatedFile, content, contentText);
      }

      if (target.kind === 'folder') {
        return this.toWorkspaceFileDocument(target);
      }

      const content =
        dto.content != null
          ? normalizeTipTapContent(dto.content)
          : normalizeTipTapContent(target.content as TipTapContent | null);
      const contentText = tipTapToPlainText(content);

      const [updatedFile] = await tx
        .update(workspaceFiles)
        .set({
          content,
          contentText,
          name: nextName,
          path: nextPath,
          updatedAt: now,
        })
        .where(eq(workspaceFiles.id, target.id))
        .returning();

      return this.toWorkspaceFileDocument(updatedFile, content, contentText);
    });
  }

  async deleteWorkspaceItem(workspaceId: string, fileId: string) {
    const target = await this.getWorkspaceFileOrThrow(workspaceId, fileId);

    if (target.kind === 'folder') {
      await this.drizzleService.db
        .delete(workspaceFiles)
        .where(
          and(
            eq(workspaceFiles.workspaceId, workspaceId),
            or(
              eq(workspaceFiles.path, target.path),
              like(workspaceFiles.path, `${escapeLikePattern(target.path)}/%`),
            ),
          ),
        );
    } else {
      await this.drizzleService.db
        .delete(workspaceFiles)
        .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.id, fileId)));
    }

    return {
      id: fileId,
    };
  }

  async listAgentFiles(
    workspaceId: string,
    directory: string,
    maxResults: number,
  ): Promise<string[]> {
    const normalizedDirectory = normalizeDirectory(directory);
    const rows = await this.drizzleService.db
      .select({
        path: workspaceFiles.path,
      })
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.kind, 'file')))
      .orderBy(asc(workspaceFiles.path));

    const filtered = rows
      .map((row) => row.path)
      .filter((itemPath) => matchesDirectory(itemPath, normalizedDirectory))
      .slice(0, maxResults);

    return filtered;
  }

  async readAgentFileTextByPath(workspaceId: string, filePath: string) {
    const normalizedPath = normalizeAgentFilePath(filePath);
    const file = await this.getWorkspaceFileByPathOrThrow(workspaceId, normalizedPath);
    const content = normalizeTipTapContent(file.content as TipTapContent | null);
    const text = file.contentText ?? tipTapToPlainText(content);

    return {
      file,
      text,
    };
  }

  async writeAgentFileTextByPath(
    workspaceId: string,
    filePath: string,
    nextText: string,
    dryRun: boolean,
  ): Promise<CreateAgentFileResult> {
    const normalizedPath = normalizeAgentFilePath(filePath);
    const existing = await this.findWorkspaceFileByPath(workspaceId, normalizedPath);
    const previousText = existing
      ? (existing.contentText ??
        tipTapToPlainText(normalizeTipTapContent(existing.content as TipTapContent | null)))
      : '';
    const nextContent = plainTextToTipTap(nextText);

    if (dryRun) {
      if (existing) {
        return { created: false, file: existing, nextText, previousText };
      }

      return {
        created: true,
        file: {
          id: 'dry-run',
          workspaceId,
          parentId: null,
          kind: 'file',
          name: pathBasename(normalizedPath),
          path: normalizedPath,
          content: nextContent,
          contentText: nextText,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nextText,
        previousText,
      };
    }

    if (existing) {
      const [updated] = await this.drizzleService.db
        .update(workspaceFiles)
        .set({
          content: nextContent,
          contentText: nextText,
          updatedAt: new Date(),
        })
        .where(eq(workspaceFiles.id, existing.id))
        .returning();

      return { created: false, file: updated, nextText, previousText };
    }

    const parentId = await this.ensureFolderPath(workspaceId, pathDirname(normalizedPath));
    const [created] = await this.drizzleService.db
      .insert(workspaceFiles)
      .values({
        content: nextContent,
        contentText: nextText,
        kind: 'file',
        name: pathBasename(normalizedPath),
        parentId,
        path: normalizedPath,
        workspaceId,
      })
      .returning();

    return { created: true, file: created, nextText, previousText };
  }

  async replaceAgentFileTextByPath(
    workspaceId: string,
    filePath: string,
    oldString: string,
    newString: string,
    expectedOccurrences: number | undefined,
    dryRun: boolean,
  ): Promise<ReplaceAgentFileResult> {
    if (!oldString) {
      throw new BadRequestException('oldString must not be empty.');
    }

    const { file, text: previousText } = await this.readAgentFileTextByPath(workspaceId, filePath);
    const occurrences = previousText.split(oldString).length - 1;

    if (occurrences === 0) {
      throw new NotFoundException(`oldString was not found in file: ${file.path}`);
    }

    if (expectedOccurrences != null && expectedOccurrences !== occurrences) {
      throw new BadRequestException(
        `Expected ${expectedOccurrences} occurrences, found ${occurrences}.`,
      );
    }

    const nextText = previousText.split(oldString).join(newString);

    if (!dryRun) {
      await this.drizzleService.db
        .update(workspaceFiles)
        .set({
          content: plainTextToTipTap(nextText),
          contentText: nextText,
          updatedAt: new Date(),
        })
        .where(eq(workspaceFiles.id, file.id));
    }

    return {
      file,
      nextText,
      occurrences,
      previousText,
    };
  }

  async searchAgentFiles(
    workspaceId: string,
    pattern: string,
    directory: string,
    maxResults: number,
  ): Promise<string[]> {
    const normalizedDirectory = normalizeDirectory(directory);
    let regex: RegExp;

    try {
      regex = new RegExp(pattern);
    } catch {
      throw new BadRequestException(`Invalid search pattern: ${pattern}`);
    }

    const files = await this.drizzleService.db
      .select()
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.kind, 'file')))
      .orderBy(asc(workspaceFiles.path));

    const matches: string[] = [];

    for (const file of files) {
      if (!matchesDirectory(file.path, normalizedDirectory)) {
        continue;
      }

      const content =
        file.contentText ??
        tipTapToPlainText(normalizeTipTapContent(file.content as TipTapContent | null));
      const lines = content.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex] ?? '';
        const match = regex.exec(line);

        if (!match) {
          continue;
        }

        matches.push(`${file.path}:${lineIndex + 1}:${(match.index ?? 0) + 1}:${line}`);

        if (matches.length >= maxResults) {
          return matches;
        }
      }
    }

    return matches;
  }

  async buildAgentWorkspaceContext(workspaceId: string): Promise<string> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    const files = await this.drizzleService.db
      .select({
        path: workspaceFiles.path,
      })
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.kind, 'file')))
      .orderBy(asc(workspaceFiles.path))
      .limit(120);

    const fileList = files.map((file) => `- ${file.path}`).join('\n');

    return [
      `当前任务运行在工作区 ${workspace.id}（${workspace.name}）。`,
      `赛道标识：${workspace.trackKey}`,
      '可操作的数据库文件路径如下：',
      fileList || '- （当前暂无文件）',
      '所有修改必须通过工具写回这些路径，不要假设本地磁盘是数据源。',
    ].join('\n');
  }

  private async ensureSeedData() {
    const [countRow] = await this.drizzleService.db
      .select({
        id: workspaces.id,
      })
      .from(workspaces)
      .limit(1);

    if (countRow) {
      return;
    }

    const now = new Date();

    await this.drizzleService.db.insert(workspaces).values([
      {
        id: '1',
        name: '公众号赛道工作区',
        trackKey: 'wechat-growth',
        description: '围绕公众号增长、内容结构和转化策略的创作空间。',
        status: 'active',
        updatedAt: now,
      },
      {
        id: 'demo',
        name: '演示工作区',
        trackKey: 'demo-lane',
        description: '用于体验文件树、Tiptap 编辑和 Agent 协作改稿。',
        status: 'active',
        updatedAt: now,
      },
    ]);
  }

  private async getWorkspaceOrThrow(workspaceId: string) {
    const [workspace] = await this.drizzleService.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new NotFoundException(`未找到工作区：${workspaceId}`);
    }

    return workspace;
  }

  private async getWorkspaceFileOrThrow(workspaceId: string, fileId: string) {
    const [row] = await this.drizzleService.db
      .select()
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.id, fileId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`未找到文件节点：${fileId}`);
    }

    return row;
  }

  private async getWorkspaceFileByPathOrThrow(workspaceId: string, filePath: string) {
    const row = await this.findWorkspaceFileByPath(workspaceId, filePath);

    if (!row || row.kind !== 'file') {
      throw new NotFoundException(`未找到文件：${filePath}`);
    }

    return row;
  }

  private async getWorkspaceFolderOrThrow(workspaceId: string, folderId: string) {
    const folder = await this.getWorkspaceFileOrThrow(workspaceId, folderId);

    if (folder.kind !== 'folder') {
      throw new BadRequestException('父节点必须是文件夹。');
    }

    return folder;
  }

  private async findWorkspaceFileByPath(workspaceId: string, filePath: string) {
    const [row] = await this.drizzleService.db
      .select()
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.path, filePath)))
      .limit(1);

    return row;
  }

  private async assertPathAvailable(
    workspaceId: string,
    filePath: string,
    ignoreId?: string,
    tx?: Pick<DrizzleService['db'], 'select'>,
  ) {
    const db = tx ?? this.drizzleService.db;
    const [existing] = await db
      .select({
        id: workspaceFiles.id,
      })
      .from(workspaceFiles)
      .where(and(eq(workspaceFiles.workspaceId, workspaceId), eq(workspaceFiles.path, filePath)))
      .limit(1);

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(`路径已存在：${filePath}`);
    }
  }

  private async ensureFolderPath(workspaceId: string, folderPath: string): Promise<string | null> {
    if (!folderPath) {
      return null;
    }

    const segments: string[] = folderPath.split('/').filter(Boolean);
    let parentId: string | null = null;
    let accumulatedPath = '';

    for (const segment of segments) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;

      const existing = await this.findWorkspaceFileByPath(workspaceId, accumulatedPath);

      if (existing) {
        if (existing.kind !== 'folder') {
          throw new ConflictException(`路径冲突：${accumulatedPath} 已是文件。`);
        }

        parentId = existing.id;
        continue;
      }

      const insertedRows: Array<{ id: string }> = await this.drizzleService.db
        .insert(workspaceFiles)
        .values({
          kind: 'folder',
          name: segment,
          parentId,
          path: accumulatedPath,
          workspaceId,
        })
        .returning({
          id: workspaceFiles.id,
        });
      const createdId: string | undefined = insertedRows[0]?.id;

      if (!createdId) {
        throw new ConflictException(`创建目录失败：${accumulatedPath}`);
      }

      parentId = createdId;
    }

    return parentId;
  }

  private toWorkspaceItem(row: WorkspaceFileModel): WorkspaceItemPayload {
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      parentId: row.parentId,
      path: row.path,
      updatedAt: row.updatedAt.toISOString(),
      workspaceId: row.workspaceId,
    };
  }

  private toWorkspaceFileDocument(
    row: WorkspaceFileModel,
    contentOverride?: TipTapContent | null,
    contentTextOverride?: string,
  ): WorkspaceFileDocumentPayload {
    if (row.kind !== 'file') {
      return {
        ...this.toWorkspaceItem(row),
        content: null,
        contentText: '',
      };
    }

    const content = contentOverride ?? normalizeTipTapContent(row.content as TipTapContent | null);
    const contentText = contentTextOverride ?? row.contentText ?? tipTapToPlainText(content);

    return {
      ...this.toWorkspaceItem(row),
      content,
      contentText,
    };
  }
}

function normalizeName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new BadRequestException('名称不能为空。');
  }

  if (trimmed.includes('/')) {
    throw new BadRequestException('名称中不能包含 /。');
  }

  return trimmed;
}

function buildPath(parentPath: string | null | undefined, name: string): string {
  if (!parentPath) {
    return name;
  }

  return `${parentPath}/${name}`;
}

function normalizeTipTapContent(content?: TipTapContent | null): TipTapContent {
  if (!content || typeof content !== 'object') {
    return DEFAULT_TIPTAP_DOC;
  }

  if (content.type === 'doc') {
    return content;
  }

  return DEFAULT_TIPTAP_DOC;
}

function tipTapToPlainText(content?: TipTapContent | null): string {
  const doc = normalizeTipTapContent(content);
  const rootNodes = Array.isArray(doc.content) ? doc.content : [];
  const paragraphs: string[] = [];

  for (const node of rootNodes) {
    const text = extractNodeText(node);

    if (text.trim().length > 0) {
      paragraphs.push(text.trimEnd());
    }
  }

  return paragraphs.join('\n\n');
}

function extractNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const record = node as { type?: unknown; text?: unknown; content?: unknown[] };

  if (record.type === 'hardBreak') {
    return '\n';
  }

  const ownText = typeof record.text === 'string' ? record.text : '';
  const children = Array.isArray(record.content) ? record.content : [];
  const childText = children.map((child) => extractNodeText(child)).join('');

  return `${ownText}${childText}`;
}

function plainTextToTipTap(value: string): TipTapContent {
  const text = value.replace(/\r\n/g, '\n');
  const blocks = text
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return DEFAULT_TIPTAP_DOC;
  }

  const content = blocks.map((block) => ({
    type: 'paragraph',
    content: toParagraphNodes(block),
  }));

  return {
    type: 'doc',
    content,
  };
}

function toParagraphNodes(block: string) {
  const lines = block.split('\n');
  const nodes: Record<string, unknown>[] = [];

  lines.forEach((line, index) => {
    if (line.length > 0) {
      nodes.push({
        type: 'text',
        text: line,
      });
    }

    if (index < lines.length - 1) {
      nodes.push({ type: 'hardBreak' });
    }
  });

  return nodes.length > 0 ? nodes : [{ type: 'text', text: '' }];
}

function normalizeDirectory(directory: string): string {
  const trimmed = directory.trim();

  if (!trimmed || trimmed === '.') {
    return '';
  }

  return normalizeAgentFilePath(trimmed).replace(/\/+$/g, '');
}

function normalizeAgentFilePath(input: string): string {
  const normalized = input.trim().replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized || normalized === '.') {
    throw new BadRequestException('文件路径不能为空。');
  }

  if (normalized.includes('..')) {
    throw new BadRequestException(`非法文件路径：${input}`);
  }

  const segments: string[] = normalized.split('/').filter(Boolean);

  if (
    segments.length === 0 ||
    segments.some((segment: string) => segment === '.' || segment === '..')
  ) {
    throw new BadRequestException(`非法文件路径：${input}`);
  }

  return segments.join('/');
}

function matchesDirectory(itemPath: string, directory: string): boolean {
  if (!directory) {
    return true;
  }

  return itemPath === directory || itemPath.startsWith(`${directory}/`);
}

function pathDirname(input: string): string {
  const segments = input.split('/');

  if (segments.length <= 1) {
    return '';
  }

  return segments.slice(0, -1).join('/');
}

function pathBasename(input: string): string {
  const segments = input.split('/');

  return segments[segments.length - 1] ?? input;
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
