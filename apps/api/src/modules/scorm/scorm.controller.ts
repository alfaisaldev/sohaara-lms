import {
  Controller, Get, Post, Delete,
  Body, Param, Query, UseGuards, UseInterceptors,
  UploadedFile, Req, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ScormService } from './scorm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const MAX_SCORM_SIZE = 200 * 1024 * 1024;

@ApiTags('SCORM')
@Controller('scorm')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScormController {
  constructor(private readonly scormService: ScormService) {}

  @Post('upload/:courseId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SCORM_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload SCORM package' })
  async upload(
    @Param('courseId') courseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException('SCORM package must be a ZIP file');
    }
    return this.scormService.upload(courseId, file, req.user.id);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'List SCORM packages for a course' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.scormService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SCORM package details' })
  async findById(@Param('id') id: string) {
    return this.scormService.findById(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete SCORM package' })
  async delete(@Param('id') id: string) {
    return this.scormService.delete(id);
  }

  @Post('track')
  @ApiOperation({ summary: 'Track SCORM lesson progress' })
  async trackProgress(
    @Body() body: { lessonId: string; enrollmentId: string; score?: number; completed: boolean; timeSpent?: number; suspendData?: string },
    @Req() req: any,
  ) {
    return this.scormService.trackProgress({
      userId: req.user.id,
      lessonId: body.lessonId,
      enrollmentId: body.enrollmentId,
      score: body.score,
      completed: body.completed,
      timeSpent: body.timeSpent,
      suspendData: body.suspendData,
    });
  }
}
