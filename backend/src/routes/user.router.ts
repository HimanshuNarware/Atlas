import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { authLimiter } from '../middlewares/rate-limiter.js';
import {
  createUserSchema,
  loginUserSchema,
  updateUserSchema,
  blockUserSchema,
  approveUserSchema,
  userIdParamSchema,
} from '../validators/user.validator.js';

export const userRouter = Router();

/**
 * @route   POST /users/create (and POST /users)
 * @desc    Register / create a new user with email, name, last_name, role, approve, delete, block
 * @access  Public
 */
userRouter.post('/create', validateBody(createUserSchema), userController.createUser);
userRouter.post('/', validateBody(createUserSchema), userController.createUser);

/**
 * @route   POST /users/login
 * @desc    Authenticate user with email and bcrypt password
 * @access  Public
 */
userRouter.post('/login', authLimiter, validateBody(loginUserSchema), authController.login);

/**
 * @route   PATCH /users/:id/block (or PUT /users/:id/block)
 * @desc    Block or unblock a user (Requires Admin Token)
 * @access  Admin Only
 */
userRouter.patch('/:id/block', requireAdmin, validateParams(userIdParamSchema), validateBody(blockUserSchema), userController.blockUser);
userRouter.put('/:id/block', requireAdmin, validateParams(userIdParamSchema), validateBody(blockUserSchema), userController.blockUser);

/**
 * @route   PATCH /users/:id/approve
 * @desc    Approve or revoke approval for a user (Requires Admin Token)
 * @access  Admin Only
 */
userRouter.patch('/:id/approve', requireAdmin, validateParams(userIdParamSchema), validateBody(approveUserSchema), userController.approveUser);

/**
 * @route   DELETE /users/:id
 * @desc    Delete (soft-delete) user by ID (Requires Admin Token)
 * @access  Admin Only
 */
userRouter.delete('/:id', requireAdmin, validateParams(userIdParamSchema), userController.deleteUser);

/**
 * @route   PATCH /users/:id (or PUT /users/:id)
 * @desc    Update user profile data
 * @access  Authenticated User
 */
userRouter.patch('/:id', authenticateToken, validateParams(userIdParamSchema), validateBody(updateUserSchema), userController.updateUser);
userRouter.put('/:id', authenticateToken, validateParams(userIdParamSchema), validateBody(updateUserSchema), userController.updateUser);

/**
 * @route   GET /users
 * @desc    List all users (Requires Admin Token)
 * @access  Admin Only
 */
userRouter.get('/', requireAdmin, userController.listUsers);

/**
 * @route   GET /users/:id
 * @desc    Get user details by ID
 * @access  Authenticated User
 */
userRouter.get('/:id', authenticateToken, validateParams(userIdParamSchema), userController.getUserById);
