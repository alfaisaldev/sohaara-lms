import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CertificateService } from './certificate.service';

@ApiTags('Public')
@Controller()
export class PublicCertificateController {
  constructor(private readonly cert: CertificateService) {}

  @Get('certificates/verify/:certificateNumber')
  @ApiOperation({ summary: 'Verify a certificate by number (public)' })
  async verify(@Param('certificateNumber') certificateNumber: string) {
    return this.cert.findByNumber(certificateNumber);
  }
}
