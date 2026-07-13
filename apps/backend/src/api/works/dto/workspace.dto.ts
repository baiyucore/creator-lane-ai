import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  trackKey!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  fileCount!: number;

  @ApiProperty()
  updatedAt!: string;
}

export class WorkspaceSummaryListDto {
  @ApiProperty({ type: [WorkspaceSummaryDto] })
  items!: WorkspaceSummaryDto[];
}

export class WorkspaceDetailDto extends WorkspaceSummaryDto {}

export class WorkspaceItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty({ enum: ['file', 'folder'] })
  kind!: 'file' | 'folder';

  @ApiProperty()
  name!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class WorkspaceItemListDto {
  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ type: [WorkspaceItemDto] })
  items!: WorkspaceItemDto[];
}

export class WorkspaceFileDocumentDto extends WorkspaceItemDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  content!: Record<string, unknown> | null;

  @ApiProperty()
  contentText!: string;
}

export class WorkspaceDeletedDto {
  @ApiProperty()
  id!: string;
}
