import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Assignments')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssignmentController {
  constructor(private readonly assignment: AssignmentService) {}

  @Get('courses/:courseId/assignments')
  @ApiOperation({ summary: 'List assignments for a course' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.assignment.findByCourse(courseId);
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Get assignment details' })
  async findById(@Param('id') id: string) {
    return this.assignment.findById(id);
  }

  @Post('courses/:courseId/assignments')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create an assignment' })
  async create(@Param('courseId') courseId: string, @Body() body: any) {
    return this.assignment.create({ ...body, courseId });
  }

  @Put('assignments/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update assignment' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.assignment.update(id, body);
  }

  @Delete('assignments/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Archive assignment' })
  async delete(@Param('id') id: string) {
    return this.assignment.delete(id);
  }

  @Post('assignments/:id/submit')
  @ApiOperation({ summary: 'Submit assignment' })
  async submit(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.assignment.submit(req.user.id, id, body.enrollmentId, body);
  }

  @Get('assignments/:id/submissions')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get all submissions (instructor)' })
  async getSubmissions(@Param('id') id: string) {
    return this.assignment.getSubmissions(id);
  }

  @Get('assignments/:id/my-submission')
  @ApiOperation({ summary: 'Get my submission' })
  async getMySubmission(@Param('id') id: string, @Req() req: any) {
    return this.assignment.getMySubmission(id, req.user.id);
  }

  @Post('submissions/:id/grade')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Grade a submission' })
  async gradeSubmission(@Param('id') id: string, @Req() req: any, @Body() body: { score: number; feedback?: string }) {
    return this.assignment.gradeSubmission(id, body, req.user.id);
  }

  @Post('assignments/:id/rubric')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Add rubric item' })
  async addRubricItem(@Param('id') id: string, @Body() body: any) {
    return this.assignment.addRubricItem(id, body);
  }
}
