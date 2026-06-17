import { Injectable } from '@nestjs/common';
import type { AuthProvider } from '@sohaara/auth';

@Injectable()
export class LocalAuthProvider {
  readonly name = 'local';
}
