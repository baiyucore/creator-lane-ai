import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ApiResponseDto } from '@/common/dto/response.dto';
import { ApiResponseWithDto } from '@/core/decorate/api-response.decorator';

import { CreateWorkspaceItemDto } from './dto/create-workspace-item.dto';
import { UpdateWorkspaceItemDto } from './dto/update-workspace-item.dto';
import {
  WorkspaceDeletedDto,
  WorkspaceDetailDto,
  WorkspaceFileDocumentDto,
  WorkspaceItemDto,
  WorkspaceItemListDto,
  WorkspaceSummaryListDto,
} from './dto/workspace.dto';
import { WorksService } from './works.service';

@ApiTags('Works')
@Controller('works')
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  @Get()
  @ApiOperation({ summary: '获取工作区列表' })
  @ApiResponseWithDto(WorkspaceSummaryListDto)
  async listWorkspaces(): ApiResponseDto<WorkspaceSummaryListDto> {
    const items = await this.worksService.listWorkspaces();

    return {
      message: '工作区列表获取成功',
      data: { items },
    };
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: '获取工作区详情' })
  @ApiResponseWithDto(WorkspaceDetailDto)
  async getWorkspaceDetail(
    @Param('workspaceId') workspaceId: string,
  ): ApiResponseDto<WorkspaceDetailDto> {
    return {
      message: '工作区详情获取成功',
      data: await this.worksService.getWorkspaceDetail(workspaceId),
    };
  }

  @Get(':workspaceId/files')
  @ApiOperation({ summary: '获取工作区文件列表' })
  @ApiResponseWithDto(WorkspaceItemListDto)
  async listWorkspaceItems(
    @Param('workspaceId') workspaceId: string,
  ): ApiResponseDto<WorkspaceItemListDto> {
    const items = await this.worksService.listWorkspaceItems(workspaceId);

    return {
      message: '工作区文件列表获取成功',
      data: { workspaceId, items },
    };
  }

  @Get(':workspaceId/files/:fileId')
  @ApiOperation({ summary: '获取工作区单个文件内容' })
  @ApiResponseWithDto(WorkspaceFileDocumentDto)
  async getWorkspaceFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
  ): ApiResponseDto<WorkspaceFileDocumentDto> {
    return {
      message: '文件内容获取成功',
      data: await this.worksService.getWorkspaceFile(workspaceId, fileId),
    };
  }

  @Post(':workspaceId/files')
  @ApiOperation({ summary: '创建工作区文件或文件夹' })
  @ApiResponseWithDto(WorkspaceItemDto)
  async createWorkspaceItem(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateWorkspaceItemDto,
  ): ApiResponseDto<WorkspaceItemDto> {
    return {
      message: '工作区节点创建成功',
      data: await this.worksService.createWorkspaceItem(workspaceId, body),
    };
  }

  @Patch(':workspaceId/files/:fileId')
  @ApiOperation({ summary: '更新工作区文件名或内容' })
  @ApiResponseWithDto(WorkspaceFileDocumentDto)
  async updateWorkspaceItem(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() body: UpdateWorkspaceItemDto,
  ): ApiResponseDto<WorkspaceFileDocumentDto> {
    return {
      message: '工作区节点更新成功',
      data: await this.worksService.updateWorkspaceItem(workspaceId, fileId, body),
    };
  }

  @Delete(':workspaceId/files/:fileId')
  @ApiOperation({ summary: '删除工作区文件或文件夹' })
  @ApiResponseWithDto(WorkspaceDeletedDto)
  async deleteWorkspaceItem(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
  ): ApiResponseDto<{ id: string }> {
    return {
      message: '工作区节点删除成功',
      data: await this.worksService.deleteWorkspaceItem(workspaceId, fileId),
    };
  }
}
