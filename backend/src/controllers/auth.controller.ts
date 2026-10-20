import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

export class AuthController {
  constructor(private readonly authServ: AuthService = authService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authServ.login(req.body);
      sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
