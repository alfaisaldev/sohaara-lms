import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Learning Paths')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningPathController {
  constructor(private readonly lp: LearningPathService) {}

  @Get('learning-paths')
  @ApiOperation({ summary: 'List learning paths' })
  async findAll(@Req() req: any) {
    return this.lp.findAll(req.user.organizationId);
  }

  @Get('learning-paths/my')
  @ApiOperation({ summary: 'Get my assigned learning paths' })
  async getMyPaths(@Req() req: any) {
    return this.lp.getMyPaths(req.user.id, req.user.organizationId);
  }

  @Get('learning-paths/search')
  @ApiOperation({ summary: 'Search published learning paths' })
  async search(@Query('q') q: string) {
    return this.lp.searchPublished(q || '');
  }

  @Get('learning-paths/join-requests/pending')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'platform_super_admin')
  @ApiOperation({ summary: 'Get pending join requests' })
  async getPendingJoinRequests(@Req() req: any) {
    return this.lp.getPendingJoinRequests(req.user.organizationId);
  }

  @Get('learning-paths/:id')
  @ApiOperation({ summary: 'Get learning path' })
  async findById(@Param('id') id: string) {
    return this.lp.findById(id);
  }

  @Post('learning-paths')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create learning path' })
  async create(@Body() body: any, @Req() req: any) {
    const organizationId = req.user.organizationId || (await this.lp.getFirstOrganizationId());
    return this.lp.create({ ...body, organizationId });
  }

  @Put('learning-paths/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update learning path' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.lp.update(id, body);
  }

  @Delete('learning-paths/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Archive learning path' })
  async delete(@Param('id') id: string) {
    return this.lp.delete(id);
  }

  @Post('learning-paths/:id/publish')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Publish learning path' })
  async publish(@Param('id') id: string) {
    return this.lp.publish(id);
  }

  @Post('learning-paths/:id/enroll')
  @ApiOperation({ summary: 'Enroll in all courses in path' })
  async enrollByPath(@Req() req: any, @Param('id') id: string) {
    return this.lp.enrollByPath(req.user.id, id);
  }

  @Post('learning-paths/:id/courses')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Add course to learning path' })
  async addCourse(@Param('id') id: string, @Body() body: { courseId: string; sortOrder?: number; isMandatory?: boolean; prerequisites?: string[] }) {
    return this.lp.addCourse(id, body);
  }

  @Put('learning-paths/:id/courses/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Reorder courses in learning path' })
  async reorderCourses(@Param('id') id: string, @Body() body: { courseIds: string[] }) {
    return this.lp.reorderCourses(id, body.courseIds);
  }

  @Delete('learning-paths/:id/courses/:courseId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Remove course from learning path' })
  async removeCourse(@Param('id') id: string, @Param('courseId') courseId: string) {
    return this.lp.removeCourse(id, courseId);
  }

  @Get('learning-paths/:id/assignments')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get learning path assignments' })
  async getAssignments(@Param('id') id: string) {
    return this.lp.getAssignments(id);
  }

  @Post('learning-paths/:id/assignments')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Add assignment to learning path' })
  async createAssignment(@Param('id') id: string, @Body() body: { assigneeType: string; assigneeId: string }) {
    return this.lp.createAssignment(id, body);
  }

  @Delete('learning-paths/:id/assignments/:assignmentId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Remove assignment from learning path' })
  async deleteAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.lp.deleteAssignment(id, assignmentId);
  }

  @Get('learning-paths/:id/progress')
  @ApiOperation({ summary: 'Get my progress in learning path' })
  async getProgress(@Req() req: any, @Param('id') id: string) {
    return this.lp.getProgress(req.user.id, id);
  }

  @Post('learning-paths/:id/progress')
  @ApiOperation({ summary: 'Update progress (mark course complete)' })
  async updateProgress(@Req() req: any, @Param('id') id: string, @Body() body: { courseId: string }) {
    return this.lp.updateProgress(req.user.id, id, body.courseId);
  }

  @Post('learning-paths/:id/join-request')
  @ApiOperation({ summary: 'Request to join a learning path' })
  async requestJoin(@Req() req: any, @Param('id') id: string, @Body() body: { message?: string }) {
    return this.lp.requestJoin(id, req.user.id, body.message);
  }

  @Put('learning-paths/join-requests/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'platform_super_admin')
  @ApiOperation({ summary: 'Approve or deny a join request' })
  async reviewJoinRequest(@Req() req: any, @Param('id') id: string, @Body() body: { action: 'approved' | 'denied' }) {
    return this.lp.reviewJoinRequest(id, req.user.id, body.action);
  }
}
