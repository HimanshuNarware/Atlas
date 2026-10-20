import { Request, Response, NextFunction } from 'express';
import { userService, UserService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';

export class UserController {
  constructor(private readonly userServ: UserService = userService) {}

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userServ.createUser(req.body);
      sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userServ.updateUser(req.params['id'] as string, req.body);
      sendSuccess(res, user, 'User updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  blockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userServ.blockUser(req.params['id'] as string, req.body.block);
      const statusMessage = req.body.block ? 'User blocked successfully' : 'User unblocked successfully';
      sendSuccess(res, user, statusMessage, 200);
    } catch (error) {
      next(error);
    }
  };

  approveUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userServ.approveUser(req.params['id'] as string, req.body.approve);
      const statusMessage = req.body.approve ? 'User approved successfully' : 'User approval revoked';
      sendSuccess(res, user, statusMessage, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.userServ.deleteUser(req.params['id'] as string);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userServ.getUserById(req.params['id'] as string);
      sendSuccess(res, user, 'User retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeDeleted = req.query['includeDeleted'] === 'true';
      const users = await this.userServ.listUsers(includeDeleted);
      sendSuccess(res, users, 'Users retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
