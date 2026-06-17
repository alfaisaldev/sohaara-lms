import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('generate-questions')
  @ApiOperation({ summary: 'Generate quiz questions via AI' })
  async generateQuestions(@Body() body: { topic: string; count?: number; type?: string }) {
    return this.ai.generateQuizQuestions(body.topic, body.count, body.type);
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize content via AI' })
  async summarize(@Body() body: { content: string; maxLength?: number }) {
    return this.ai.summarizeContent(body.content, body.maxLength);
  }

  @Post('recommend-courses')
  @ApiOperation({ summary: 'Get AI course recommendations' })
  async recommendCourses(@Body() body: { userId: string; limit?: number }) {
    return this.ai.recommendCourses(body.userId, body.limit);
  }
}
