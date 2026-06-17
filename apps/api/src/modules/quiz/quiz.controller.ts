import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Quizzes')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get('courses/:courseId/quizzes')
  @ApiOperation({ summary: 'List quizzes for a course' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.quiz.findByCourse(courseId);
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Get quiz with questions' })
  async findById(@Param('id') id: string) {
    return this.quiz.findById(id);
  }

  @Post('courses/:courseId/quizzes')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a quiz' })
  async create(@Param('courseId') courseId: string, @Body() body: any) {
    return this.quiz.create({ ...body, courseId });
  }

  @Put('quizzes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update quiz settings' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.quiz.update(id, body);
  }

  @Delete('quizzes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Archive quiz' })
  async delete(@Param('id') id: string) {
    return this.quiz.delete(id);
  }

  @Post('quizzes/:quizId/questions')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Add question to quiz' })
  async addQuestion(@Param('quizId') quizId: string, @Body() body: any) {
    return this.quiz.addQuestion(quizId, body);
  }

  @Put('questions/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update a question' })
  async updateQuestion(@Param('id') id: string, @Body() body: any) {
    return this.quiz.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete a question' })
  async deleteQuestion(@Param('id') id: string) {
    return this.quiz.deleteQuestion(id);
  }

  @Put('quizzes/:quizId/questions/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Reorder questions' })
  async reorderQuestions(@Param('quizId') quizId: string, @Body() body: { questionIds: string[] }) {
    return this.quiz.reorderQuestions(quizId, body.questionIds);
  }

  @Post('quizzes/:quizId/attempts')
  @ApiOperation({ summary: 'Start a quiz attempt' })
  async startAttempt(@Param('quizId') quizId: string, @Req() req: any, @Body() body: { enrollmentId: string }) {
    return this.quiz.startAttempt(req.user.id, quizId, body.enrollmentId);
  }

  @Get('quizzes/:quizId/attempts')
  @ApiOperation({ summary: 'Get my attempts for a quiz' })
  async getAttempts(@Param('quizId') quizId: string, @Req() req: any) {
    return this.quiz.getAttempts(req.user.id, quizId);
  }

  @Get('attempts/:id')
  @ApiOperation({ summary: 'Get attempt details' })
  async getAttempt(@Param('id') id: string, @Req() req: any) {
    return this.quiz.getAttempt(id, req.user.id);
  }

  @Post('attempts/:id/answers')
  @ApiOperation({ summary: 'Submit answer for a question' })
  async submitAnswer(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.quiz.submitAnswer(id, req.user.id, body);
  }

  @Post('attempts/:id/submit')
  @ApiOperation({ summary: 'Submit entire quiz attempt' })
  async submitAttempt(@Param('id') id: string, @Req() req: any) {
    return this.quiz.submitAttempt(id, req.user.id);
  }

  @Get('question-banks')
  @ApiOperation({ summary: 'List question banks' })
  async getQuestionBanks(@Query('organizationId') organizationId: string) {
    return this.quiz.getQuestionBanks(organizationId);
  }
}
