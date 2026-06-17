import { Module } from '@nestjs/common';
import { CertificateController } from './certificate.controller';
import { PublicCertificateController } from './public-certificate.controller';
import { CertificateService } from './certificate.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CertificateController, PublicCertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}
