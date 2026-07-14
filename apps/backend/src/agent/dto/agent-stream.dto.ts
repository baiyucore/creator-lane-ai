import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { SUPPORTED_AGENT_MODEL_IDS, type SupportedAgentModelId } from '../agent-provider.config';

const AGENT_MESSAGE_ROLES = ['system', 'user', 'assistant'] as const;

export type AgentMessageRole = (typeof AGENT_MESSAGE_ROLES)[number];

export class AgentMessageDto {
  @IsIn(AGENT_MESSAGE_ROLES)
  role!: AgentMessageRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  content!: string;
}

export class AgentStreamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AgentMessageDto)
  messages?: AgentMessageDto[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  workspaceRoot?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  activeFilePath?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  threadId?: string;

  @IsOptional()
  @IsIn(SUPPORTED_AGENT_MODEL_IDS)
  model?: SupportedAgentModelId;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  dryRun?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(80)
  @Type(() => Number)
  recursionLimit?: number;
}
