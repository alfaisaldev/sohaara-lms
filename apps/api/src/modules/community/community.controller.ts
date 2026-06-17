import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Community')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('community/posts')
  @ApiOperation({ summary: 'List discussion posts' })
  async getPosts(@Query('courseId') courseId?: string) {
    return this.community.getPosts(courseId);
  }

  @Get('community/posts/:id')
  @ApiOperation({ summary: 'Get post with replies' })
  async getPost(@Param('id') id: string) {
    return this.community.getPost(id);
  }

  @Post('community/posts')
  @ApiOperation({ summary: 'Create a discussion post' })
  async createPost(@Req() req: any, @Body() body: any) {
    return this.community.createPost({
      ...body,
      authorId: req.user.id,
      organizationId: req.user.organizationId,
    });
  }

  @Put('community/posts/:id')
  @ApiOperation({ summary: 'Update post' })
  async updatePost(@Param('id') id: string, @Body() body: any) {
    return this.community.updatePost(id, body);
  }

  @Delete('community/posts/:id')
  @ApiOperation({ summary: 'Delete post' })
  async deletePost(@Param('id') id: string) {
    return this.community.deletePost(id);
  }

  @Post('community/posts/:id/pin')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Toggle pin post' })
  async togglePin(@Param('id') id: string) {
    return this.community.togglePin(id);
  }

  @Post('community/replies')
  @ApiOperation({ summary: 'Add a reply' })
  async addReply(@Req() req: any, @Body() body: any) {
    return this.community.addReply({ ...body, authorId: req.user.id });
  }

  @Delete('community/replies/:id')
  @ApiOperation({ summary: 'Delete a reply' })
  async deleteReply(@Param('id') id: string) {
    return this.community.deleteReply(id);
  }
}
