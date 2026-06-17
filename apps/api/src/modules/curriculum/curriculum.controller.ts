import { Controller, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurriculumService } from './curriculum.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Curriculum')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CurriculumController {
  constructor(private readonly curriculum: CurriculumService) {}

  // ─── Modules ───

  @Post('courses/:courseId/modules')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a module in a course' })
  async createModule(@Param('courseId') courseId: string, @Body() body: { title: string; description?: string }) {
    return this.curriculum.createModule(courseId, body);
  }

  @Put('modules/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update a module' })
  async updateModule(@Param('id') id: string, @Body() body: { title?: string; description?: string }) {
    return this.curriculum.updateModule(id, body);
  }

  @Delete('modules/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete a module' })
  async deleteModule(@Param('id') id: string) {
    return this.curriculum.deleteModule(id);
  }

  @Put('courses/:courseId/modules/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Reorder modules in a course' })
  async reorderModules(@Param('courseId') courseId: string, @Body() body: { moduleIds: string[] }) {
    return this.curriculum.reorderModules(courseId, body.moduleIds);
  }

  // ─── Sections ───

  @Post('modules/:moduleId/sections')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a section in a module' })
  async createSection(@Param('moduleId') moduleId: string, @Body() body: { title: string; description?: string }) {
    return this.curriculum.createSection(moduleId, body);
  }

  @Put('sections/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update a section' })
  async updateSection(@Param('id') id: string, @Body() body: { title?: string; description?: string }) {
    return this.curriculum.updateSection(id, body);
  }

  @Delete('sections/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete a section' })
  async deleteSection(@Param('id') id: string) {
    return this.curriculum.deleteSection(id);
  }

  @Put('modules/:moduleId/sections/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Reorder sections in a module' })
  async reorderSections(@Param('moduleId') moduleId: string, @Body() body: { sectionIds: string[] }) {
    return this.curriculum.reorderSections(moduleId, body.sectionIds);
  }

  // ─── Lessons ───

  @Post('sections/:sectionId/lessons')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a lesson in a section' })
  async createLesson(@Param('sectionId') sectionId: string, @Body() body: any) {
    return this.curriculum.createLesson(sectionId, body);
  }

  @Put('lessons/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update a lesson' })
  async updateLesson(@Param('id') id: string, @Body() body: any) {
    return this.curriculum.updateLesson(id, body);
  }

  @Delete('lessons/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete a lesson' })
  async deleteLesson(@Param('id') id: string) {
    return this.curriculum.deleteLesson(id);
  }

  @Put('sections/:sectionId/lessons/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Reorder lessons in a section' })
  async reorderLessons(@Param('sectionId') sectionId: string, @Body() body: { lessonIds: string[] }) {
    return this.curriculum.reorderLessons(sectionId, body.lessonIds);
  }

  // ─── Bulk Save ───

  @Put('courses/:courseId/curriculum')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Bulk save entire curriculum (autosave)' })
  async saveCurriculum(@Param('courseId') courseId: string, @Body() body: any) {
    return this.curriculum.saveCurriculum(courseId, body);
  }

  // ─── Resources ───

  @Post('lessons/:lessonId/resources')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Add a resource to a lesson' })
  async addResource(@Param('lessonId') lessonId: string, @Body() body: any) {
    return this.curriculum.addResource(lessonId, body);
  }

  @Delete('resources/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete a resource' })
  async deleteResource(@Param('id') id: string) {
    return this.curriculum.deleteResource(id);
  }
}
