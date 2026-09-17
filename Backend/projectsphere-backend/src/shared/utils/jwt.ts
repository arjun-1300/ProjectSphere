import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../errors/AppError.js';
import { ErrorCode } from '../errors/errorCodes.js';
import type { Role } from '@prisma/client';

/** Claims embedded in the short-lived access token. */
export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Malformed token', ErrorCode.TOKEN_INVALID);
    }
    return decoded as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired', ErrorCode.TOKEN_EXPIRED);
    }
    throw new UnauthorizedError('Invalid access token', ErrorCode.TOKEN_INVALID);
  }
}
