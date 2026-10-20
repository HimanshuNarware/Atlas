import { userRepository, UserRepository, UpdateUserData } from '../repositories/user.repository.js';
import { hashPassword } from '../utils/crypto.js';
import { ConflictError, NotFoundError } from '../errors/app-error.js';
import { SanitizedUser, sanitizeUser } from '../models/user.model.js';
import { CreateUserInput, UpdateUserInput } from '../validators/user.validator.js';

export class UserService {
  constructor(private readonly userRepo: UserRepository = userRepository) {}

  async createUser(input: CreateUserInput): Promise<SanitizedUser> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const newUser = await this.userRepo.create({
      email: input.email,
      name: input.name,
      last_name: input.last_name,
      password_hash: passwordHash,
      role: input.role,
      approve: input.approve,
      delete: input.delete,
      block: input.block,
    });

    return sanitizeUser(newUser);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<SanitizedUser> {
    const user = await this.userRepo.findById(id);
    if (!user || user.delete) {
      throw new NotFoundError('User not found');
    }

    const updatePayload: UpdateUserData = {
      name: input.name,
      last_name: input.last_name,
      role: input.role,
      approve: input.approve,
      block: input.block,
      delete: input.delete,
    };

    if (input.password) {
      updatePayload.password_hash = await hashPassword(input.password);
    }

    const updatedUser = await this.userRepo.update(id, updatePayload);
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    return sanitizeUser(updatedUser);
  }

  async blockUser(id: string, block: boolean): Promise<SanitizedUser> {
    const user = await this.userRepo.findById(id);
    if (!user || user.delete) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await this.userRepo.setBlockStatus(id, block);
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    return sanitizeUser(updatedUser);
  }

  async approveUser(id: string, approve: boolean): Promise<SanitizedUser> {
    const user = await this.userRepo.findById(id);
    if (!user || user.delete) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await this.userRepo.setApproveStatus(id, approve);
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    return sanitizeUser(updatedUser);
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await this.userRepo.findById(id);
    if (!user || user.delete) {
      throw new NotFoundError('User not found');
    }

    await this.userRepo.softDelete(id);
    return { message: `User with id ${id} deleted successfully` };
  }

  async getUserById(id: string): Promise<SanitizedUser> {
    const user = await this.userRepo.findById(id);
    if (!user || user.delete) {
      throw new NotFoundError('User not found');
    }

    return sanitizeUser(user);
  }

  async listUsers(includeDeleted = false): Promise<SanitizedUser[]> {
    const users = await this.userRepo.findAll(includeDeleted);
    return users.map(sanitizeUser);
  }
}

export const userService = new UserService();
