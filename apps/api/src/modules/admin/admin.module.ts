import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, KeycloakAdminService],
  exports: [KeycloakAdminService],
})
export class AdminModule {}
