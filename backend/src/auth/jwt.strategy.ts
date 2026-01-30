import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'secretKey', // TODO: Move to environment variable
    });
  }

  async validate(payload: any) {
    // This payload is the decoded JWT token
    // We return what we want to be available in request.user
    return { userId: payload.sub, email: payload.email, profile: payload.profile };
  }
}