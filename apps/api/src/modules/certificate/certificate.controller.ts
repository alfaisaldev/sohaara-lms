import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CertificateService } from './certificate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Certificates')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificateController {
  constructor(private readonly cert: CertificateService) {}

  @Get('certificates')
  @ApiOperation({ summary: 'Get my certificates' })
  async myCertificates(@Req() req: any) {
    return this.cert.findByUser(req.user.id);
  }

  @Get('certificates/all')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'super_admin')
  @ApiOperation({ summary: 'Admin: list all certificates (filter by status)' })
  async findAllAdmin(@Query('status') status?: string, @Query('search') search?: string) {
    return this.cert.findAllAdmin({ status, search });
  }

  @Get('certificates/:id')
  @ApiOperation({ summary: 'Get certificate details' })
  async findById(@Param('id') id: string) {
    return this.cert.findById(id);
  }

  @Get('courses/:courseId/certificates')
  @ApiOperation({ summary: 'List certificates for a course' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.cert.findByCourse(courseId);
  }

  @Post('certificates/issue')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'super_admin')
  @ApiOperation({ summary: 'Issue a certificate (admin manual issue)' })
  async issue(@Body() body: any) {
    return this.cert.issue(body);
  }

  @Post('certificates/:id/release')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'super_admin')
  @ApiOperation({ summary: 'Admin: release/approve a pending certificate' })
  async release(@Param('id') id: string, @Req() req: any) {
    return this.cert.release(id, req.user.id);
  }

  @Post('certificates/:id/revoke')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager', 'super_admin')
  @ApiOperation({ summary: 'Revoke a certificate' })
  async revoke(@Param('id') id: string) {
    return this.cert.revoke(id);
  }

  // ─── Certificate templates ───

  @Get('certificate-templates')
  @ApiOperation({ summary: 'Get certificate templates (org-specific + global)' })
  async getTemplates(@Req() req: any) {
    return this.cert.getTemplates(req.user.organizationId);
  }

  @Post('certificate-templates')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create certificate template' })
  async createTemplate(@Body() body: any, @Req() req: any) {
    return this.cert.createTemplate({
      ...body,
      organizationId: req.user.organizationId || null,
    });
  }

  // Static sub-routes must come before :id

  @Post('certificate-templates/:id/image')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload background image for a template' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.cert.uploadTemplateImage(id, file);
  }

  @Delete('certificate-templates/:id/image')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Remove background image from a template' })
  async removeImage(@Param('id') id: string) {
    return this.cert.removeTemplateImage(id);
  }

  @Get('certificate-templates/:id')
  @ApiOperation({ summary: 'Get certificate template by ID' })
  async getTemplate(@Param('id') id: string) {
    return this.cert.getTemplate(id);
  }

  @Put('certificate-templates/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update certificate template' })
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.cert.updateTemplate(id, body);
  }

  @Delete('certificate-templates/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete template' })
  async deleteTemplate(@Param('id') id: string) {
    return this.cert.deleteTemplate(id);
  }

  // ─── Certificate logos ───

  @Get('certificate-logos')
  @ApiOperation({ summary: 'List reusable certificate logos' })
  async listLogos(@Req() req: any) {
    return this.cert.listLogos(req.user.organizationId);
  }

  @Post('certificate-logos')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a reusable certificate logo' })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name?: string },
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.cert.uploadLogo(file, {
      name: body.name,
      organizationId: req.user.organizationId,
    });
  }

  @Delete('certificate-logos/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a certificate logo' })
  async deleteLogo(@Param('id') id: string) {
    return this.cert.deleteLogo(id);
  }
}
