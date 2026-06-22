import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResourceService } from './resource.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Resources')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourceController {
  constructor(private readonly resource: ResourceService) {}

  @Get('courses/:courseId/resources')
  @ApiOperation({ summary: 'List resources for a course' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.resource.findByCourse(courseId);
  }

  @Get('resources/:id')
  @ApiOperation({ summary: 'Get resource details' })
  async findById(@Param('id') id: string) {
    return this.resource.findById(id);
  }

  @Post('courses/:courseId/resources')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'super_admin')
  @ApiOperation({ summary: 'Add a resource' })
  async create(@Param('courseId') courseId: string, @Body() body: any) {
    return this.resource.create({ ...body, courseId });
  }

  @Put('resources/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'super_admin')
  @ApiOperation({ summary: 'Update resource' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.resource.update(id, body);
  }

  @Delete('resources/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'super_admin')
  @ApiOperation({ summary: 'Delete resource' })
  async delete(@Param('id') id: string) {
    return this.resource.delete(id);
  }
}
