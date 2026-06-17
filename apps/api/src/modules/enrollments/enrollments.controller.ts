import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Enrollments')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Enroll in a course' })
  async enroll(@Param('courseId') courseId: string, @Req() req: any) {
    return this.enrollments.enroll(req.user.id, courseId);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'Get my enrollments' })
  async getEnrollments(@Req() req: any) {
    return this.enrollments.getEnrollments(req.user.id);
  }

  @Get('enrollments/:courseId')
  @ApiOperation({ summary: 'Get enrollment details with progress' })
  async getEnrollment(@Param('courseId') courseId: string, @Req() req: any) {
    return this.enrollments.getEnrollment(req.user.id, courseId);
  }

  @Post('lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Mark lesson as complete' })
  async completeLesson(
    @Param('lessonId') lessonId: string,
    @Body() body: { enrollmentId: string; timeSpent?: number; watchProgress?: number; score?: number },
    @Req() req: any,
  ) {
    return this.enrollments.completeLesson(req.user.id, lessonId, body.enrollmentId, body);
  }

  @Put('lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Update lesson watch progress' })
  async updateProgress(
    @Param('lessonId') lessonId: string,
    @Body() body: { enrollmentId: string; watchProgress: number; timeSpent?: number },
    @Req() req: any,
  ) {
    return this.enrollments.updateProgress(req.user.id, lessonId, body.enrollmentId, body.watchProgress, body.timeSpent);
  }

  @Delete('enrollments/:courseId')
  @ApiOperation({ summary: 'Drop enrollment' })
  async dropEnrollment(@Param('courseId') courseId: string, @Req() req: any) {
    return this.enrollments.dropEnrollment(req.user.id, courseId);
  }

  @Get('enrollments/admin/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get enrollments for a specific user (admin/staff)' })
  async getEnrollmentsForUser(@Param('userId') userId: string) {
    return this.enrollments.getEnrollments(userId);
  }

  @Get('enrollments/admin/:userId/:courseId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get enrollment detail for a specific user and course (admin/staff)' })
  async getEnrollmentDetailForUser(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.enrollments.getEnrollment(userId, courseId);
  }

  // ─── Bookmarks ───

  @Get('bookmarks')
  @ApiOperation({ summary: 'Get my bookmarks' })
  async getBookmarks(@Req() req: any, @Query('lessonId') lessonId?: string) {
    return this.enrollments.getBookmarks(req.user.id, lessonId);
  }

  @Post('bookmarks')
  @ApiOperation({ summary: 'Create a bookmark' })
  async createBookmark(@Req() req: any, @Body() body: { lessonId: string; timestamp?: number; note?: string }) {
    return this.enrollments.createBookmark(req.user.id, body);
  }

  @Delete('bookmarks/:id')
  @ApiOperation({ summary: 'Delete a bookmark' })
  async deleteBookmark(@Param('id') id: string, @Req() req: any) {
    return this.enrollments.deleteBookmark(id, req.user.id);
  }

  // ─── Notes ───

  @Get('notes')
  @ApiOperation({ summary: 'Get my notes' })
  async getNotes(@Req() req: any, @Query('lessonId') lessonId?: string) {
    return this.enrollments.getNotes(req.user.id, lessonId);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Create a note' })
  async createNote(@Req() req: any, @Body() body: { lessonId: string; content: string; timestamp?: number }) {
    return this.enrollments.createNote(req.user.id, body);
  }

  @Put('notes/:id')
  @ApiOperation({ summary: 'Update a note' })
  async updateNote(@Param('id') id: string, @Req() req: any, @Body() body: { content?: string }) {
    return this.enrollments.updateNote(id, req.user.id, body);
  }

  @Delete('notes/:id')
  @ApiOperation({ summary: 'Delete a note' })
  async deleteNote(@Param('id') id: string, @Req() req: any) {
    return this.enrollments.deleteNote(id, req.user.id);
  }
}
