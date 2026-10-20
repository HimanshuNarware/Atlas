import { query } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Role } from '../constants/roles.js';

export interface CreateUserData {
  email: string;
  name: string;
  last_name: string;
  password_hash: string;
  role: Role;
  approve: boolean;
  delete: boolean;
  block: boolean;
}

export interface UpdateUserData {
  name?: string;
  last_name?: string;
  password_hash?: string;
  role?: Role;
  approve?: boolean;
  delete?: boolean;
  block?: boolean;
}

export class UserRepository {
  async create(data: CreateUserData): Promise<User> {
    const text = `
      INSERT INTO users (email, name, last_name, password_hash, role, approve, delete, block)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      data.email.toLowerCase(),
      data.name,
      data.last_name,
      data.password_hash,
      data.role,
      data.approve,
      data.delete,
      data.block,
    ];

    const result = await query<User>(text, params);
    const user = result.rows[0];
    if (!user) {
      throw new Error('Failed to create user record');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const text = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1';
    const result = await query<User>(text, [email]);
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const text = 'SELECT * FROM users WHERE id = $1 LIMIT 1';
    const result = await query<User>(text, [id]);
    return result.rows[0] ?? null;
  }

  async findAll(includeDeleted = false): Promise<User[]> {
    const text = includeDeleted
      ? 'SELECT * FROM users ORDER BY created_at DESC'
      : 'SELECT * FROM users WHERE "delete" = false ORDER BY created_at DESC';
    const result = await query<User>(text);
    return result.rows;
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.last_name !== undefined) {
      fields.push(`last_name = $${paramIndex++}`);
      values.push(data.last_name);
    }
    if (data.password_hash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(data.password_hash);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.approve !== undefined) {
      fields.push(`approve = $${paramIndex++}`);
      values.push(data.approve);
    }
    if (data.delete !== undefined) {
      fields.push(`"delete" = $${paramIndex++}`);
      values.push(data.delete);
    }
    if (data.block !== undefined) {
      fields.push(`block = $${paramIndex++}`);
      values.push(data.block);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const text = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<User>(text, values);
    return result.rows[0] ?? null;
  }

  async setBlockStatus(id: string, block: boolean): Promise<User | null> {
    const text = `
      UPDATE users
      SET block = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await query<User>(text, [block, id]);
    return result.rows[0] ?? null;
  }

  async setApproveStatus(id: string, approve: boolean): Promise<User | null> {
    const text = `
      UPDATE users
      SET approve = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await query<User>(text, [approve, id]);
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<User | null> {
    const text = `
      UPDATE users
      SET "delete" = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await query<User>(text, [id]);
    return result.rows[0] ?? null;
  }

  async hardDelete(id: string): Promise<boolean> {
    const text = 'DELETE FROM users WHERE id = $1';
    const result = await query(text, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const userRepository = new UserRepository();
