import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { User } from './entities/user.entity'; // Assuming you have a User entity defined
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly supabase: SupabaseService
  ) {}

  async createUser(user: Partial<User>): Promise<User> {
    console.log(user);
    
    return this.supabase.insert<User>('users', user);
  }

  async getUsersWithPagination(
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number
  ): Promise<{ data: User[]; meta: any }> {
    const offset = (page - 1) * limit;

    const keyword = search.trim().toLowerCase();

    const { data, error, count } = await this.supabase.client
      .from('users')
      .select('*', { count: 'exact' })
      .or(`name.ilike.%${keyword}%,role.ilike.%${keyword}%,userid.ilike.%${keyword}%`)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return {
      data,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }


	async getAllUsers() {
    return this.supabase.findAll<User>('users');
  }

  async getUserByNisNik(userid: string | number): Promise<User | null> {
		return this.supabase.findByNisNik<User>('users', userid);
	}

	async getUserById(id: string | number): Promise<User | null> {
		return this.supabase.findByUserId<User>('users', id);
	}

  async updateUserStatus(id: string | number, isActive: boolean, updatedAt: Date, updatedBy: string): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updated = await this.supabase.update<User>('users', id, {
      is_active: isActive,
      updated_at: updatedAt,
      updated_by: updatedBy,
    });

    if (!updated) {
      throw new NotFoundException(`Failed to update status for user ${id}`);
    }

    return updated;
  }


  async updateUser(id: string | number, body: Partial<User>): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updated = await this.supabase.update<User>('users', id, body);

    if (!updated) {
      throw new NotFoundException(`Failed to update status for user ${id}`);
    }

    return updated;
  }


  async generatePasswordSiswa(password: string): Promise<number> {
    const newPass = bcrypt.hashSync(password, 10);// Hash the password before saving
    const count = await this.supabase.updateAllByRole<User>('users', 'SISWA', {
      password: newPass,
    });

    if (count === 0) {
      throw new NotFoundException('No SISWA users found to update');
    }

    this.logger.log(`Updated ${count} SISWA passwords`);

    return count;
  }
}
