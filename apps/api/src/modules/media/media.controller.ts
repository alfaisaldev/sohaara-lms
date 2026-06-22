import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, UseInterceptors,
  UploadedFile, Req, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed',
  'application/json', 'text/html',
];

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name?: string; folderId?: string; alt?: string; tags?: string },
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
    const tags = body.tags ? body.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    return this.mediaService.upload(file, {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      name: body.name,
      folderId: body.folderId,
      alt: body.alt,
      tags,
    });
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Only image files allowed');
    return this.mediaService.uploadAvatar(req.user.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'List media' })
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('mimeType') mimeType?: string,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
  ) {
    return this.mediaService.findAll({
      organizationId: req.user.organizationId,
      mimeType,
      folderId,
      search,
      page,
      limit,
    });
  }

  // ─── Folders (before :id to avoid route conflict) ───

  @Post('folders')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create folder' })
  async createFolder(@Body() body: { name: string; parentId?: string }, @Req() req: any) {
    if (!body.name) throw new BadRequestException('Folder name is required');
    return this.mediaService.createFolder({
      name: body.name,
      organizationId: req.user.organizationId,
      parentId: body.parentId,
    });
  }

  @Get('folders')
  @ApiOperation({ summary: 'List folders' })
  async listFolders(@Req() req: any) {
    return this.mediaService.listFolders(req.user.organizationId);
  }

  @Delete('folders/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete folder' })
  async deleteFolder(@Param('id') id: string) {
    return this.mediaService.deleteFolder(id);
  }

  // ─── Media CRUD ───

  @Get(':id')
  @ApiOperation({ summary: 'Get media by ID' })
  async findById(@Param('id') id: string) {
    return this.mediaService.findById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update media metadata' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.mediaService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete media' })
  async delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
