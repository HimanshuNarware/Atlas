import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { comparePassword } from '../utils/crypto.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';
import { SanitizedUser, sanitizeUser, UserAuthPayload } from '../models/user.model.js';
import { LoginUserInput } from '../validators/user.validator.js';

export interface LoginResult {
  token: string;
  user: SanitizedUser;
}

export class AuthService {
  constructor(private readonly userRepo: UserRepository = userRepository) {}

  async login(input: LoginUserInput): Promise<LoginResult> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.delete) {
      throw new UnauthorizedError('Account has been deleted');
    }

    if (user.block) {
      throw new ForbiddenError('Your account has been blocked. Please contact an administrator.');
    }

    const isPasswordValid = await comparePassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: UserAuthPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      user: sanitizeUser(user),
    };
  }

  verifyToken(token: string): UserAuthPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as UserAuthPayload;
      return decoded;
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  }
}

export const authService = new AuthService();
