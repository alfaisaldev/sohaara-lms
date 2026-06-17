import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List all courses' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('level') level?: string,
    @Query('includeHidden') includeHidden?: string,
  ) {
    return this.coursesService.findAll({ page, limit, search, organizationId, categoryId, status, level, includeHidden: includeHidden === 'true' });
  }

  @Get('categories')
  @ApiOperation({ summary: 'List course categories' })
  async getCategories(@Query('organizationId') organizationId?: string) {
    return this.coursesService.getCategories(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID with full structure' })
  async findById(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a new course' })
  async create(@Body() body: any, @Req() req: any) {
    const orgId = body.organizationId || req.user.organizationId;
    return this.coursesService.create({
      ...body,
      organizationId: orgId || (await this.coursesService.getFirstOrganizationId()),
      createdById: req.user.id,
    });
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update course' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.coursesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete course (soft)' })
  async delete(@Param('id') id: string) {
    return this.coursesService.delete(id);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Publish course' })
  async publish(@Param('id') id: string) {
    return this.coursesService.publish(id);
  }

  @Post(':id/archive')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Archive course' })
  async archive(@Param('id') id: string) {
    return this.coursesService.archive(id);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Duplicate course' })
  async duplicate(@Param('id') id: string) {
    return this.coursesService.duplicate(id);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create course category' })
  async createCategory(@Body() body: any) {
    return this.coursesService.createCategory(body);
  }

  @Put('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update course category' })
  async updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.coursesService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete course category' })
  async deleteCategory(@Param('id') id: string) {
    return this.coursesService.deleteCategory(id);
  }
}
