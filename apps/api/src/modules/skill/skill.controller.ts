import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillService } from './skill.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Skills')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SkillController {
  constructor(private readonly skill: SkillService) {}

  @Get('skills/categories')
  @ApiOperation({ summary: 'Get skill categories with skills' })
  async getCategories(@Req() req: any) {
    return this.skill.getCategories(req.user.organizationId);
  }

  @Post('skills/categories')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create skill category' })
  async createCategory(@Body() body: any, @Req() req: any) {
    return this.skill.createCategory({ ...body, organizationId: req.user.organizationId });
  }

  @Put('skills/categories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update skill category' })
  async updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.skill.updateCategory(id, body);
  }

  @Delete('skills/categories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete skill category' })
  async deleteCategory(@Param('id') id: string) {
    return this.skill.deleteCategory(id);
  }

  @Post('skills')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create a skill' })
  async createSkill(@Body() body: any) {
    return this.skill.createSkill(body);
  }

  @Put('skills/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update a skill' })
  async updateSkill(@Param('id') id: string, @Body() body: any) {
    return this.skill.updateSkill(id, body);
  }

  @Delete('skills/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a skill' })
  async deleteSkill(@Param('id') id: string) {
    return this.skill.deleteSkill(id);
  }

  @Get('skills/user/me')
  @ApiOperation({ summary: 'Get my skills' })
  async getMySkills(@Req() req: any) {
    return this.skill.getUserSkills(req.user.id);
  }

  @Get('skills/user/:userId')
  @ApiOperation({ summary: 'Get user skills' })
  async getUserSkills(@Param('userId') userId: string) {
    return this.skill.getUserSkills(userId);
  }

  @Post('skills/user/:skillId')
  @ApiOperation({ summary: 'Set user skill score' })
  async setUserSkill(@Req() req: any, @Param('skillId') skillId: string, @Body() body: any) {
    return this.skill.setUserSkill(req.user.id, skillId, body);
  }
}
