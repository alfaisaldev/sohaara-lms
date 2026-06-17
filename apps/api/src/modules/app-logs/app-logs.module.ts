import { Module, Global } from '@nestjs/common';
import { AppLogsService } from './app-logs.service';
import { AppLogsController } from './app-logs.controller';
import { AppLogInterceptor } from './app-logs.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  controllers: [AppLogsController],
  providers: [
    AppLogsService,
    { provide: APP_INTERCEPTOR, useClass: AppLogInterceptor },
  ],
  exports: [AppLogsService],
})
export class AppLogsModule {}
