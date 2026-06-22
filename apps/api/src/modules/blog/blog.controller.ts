import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Blog')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get('blog/posts')
  @ApiOperation({ summary: 'List blog posts' })
  async getPosts(@Query('status') status?: string) {
    return this.blog.getPosts(undefined, status);
  }

  @Get('blog/posts/:id')
  @ApiOperation({ summary: 'Get blog post' })
  async getPost(@Param('id') id: string) {
    return this.blog.getPost(id);
  }

  @Post('blog/posts')
  @ApiOperation({ summary: 'Create blog post' })
  async create(@Req() req: any, @Body() body: any) {
    return this.blog.create({ ...body, authorId: req.user.id, organizationId: req.user.organizationId });
  }

  @Put('blog/posts/:id')
  @ApiOperation({ summary: 'Update blog post' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.blog.update(id, body);
  }

  @Delete('blog/posts/:id')
  @ApiOperation({ summary: 'Delete blog post' })
  async delete(@Param('id') id: string) {
    return this.blog.delete(id);
  }

  @Get('blog/categories')
  @ApiOperation({ summary: 'List blog categories' })
  async getCategories() {
    return this.blog.getCategories();
  }

  @Post('blog/categories')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() body: any) {
    return this.blog.createCategory(body);
  }

  @Put('blog/categories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.blog.updateCategory(id, body);
  }

  @Delete('blog/categories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string) {
    return this.blog.deleteCategory(id);
  }
}
