import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { WorksModule } from '@/api/works/works.module';

@Module({
  imports: [WorksModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
