import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Like, ILike, IsNull, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/common/enums/role.enum';
import { Exam } from 'src/exams/entities/exam.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  async createUser(user: Partial<User>): Promise<User> {
    delete user.id;
    console.log(user);

    // Bersihkan string kosong
    Object.keys(user).forEach(key => {
      if (user[key] === "") {
        user[key] = null;
      }
    });
    
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
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

    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .where('user.deleted_at IS NULL');

    if (keyword) {
      queryBuilder.andWhere(
        '(LOWER(user.name) LIKE :keyword OR LOWER(user.role) LIKE :keyword OR LOWER(user.userid) LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder
      .orderBy(`user.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { deleted_at: IsNull() },
      order: { is_active: 'DESC', name: 'ASC' }
    });
  }

  async getUserByNisNik(userid: string | number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { userid: String(userid), deleted_at: IsNull() }
    });
  }

  async getUserById(id: string | number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: String(id), deleted_at: IsNull() }
    });
  }

  async updateUserStatus(id: string | number, isActive: boolean, updatedAt: Date, updatedBy: string): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.is_active = isActive;
    user.updated_at = updatedAt;
    user.updated_by = updatedBy;

    return this.userRepository.save(user);
  }

  async updateUser(id: string | number, body: Partial<User>): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, body);
    return this.userRepository.save(user);
  }

  private generateRandomString(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate one random password, set ALL SISWA to that password (hashed),
   * and return the plain new password and updated count.
   */
  async generateSamePasswordForAllSiswa(): Promise<{ updated: number; newPassword: string }> {
    // 1) generate plain password
    const rawPassword = `SISWA-${this.generateRandomString(8)}`;

    // 2) hash it
    const hashed = bcrypt.hashSync(rawPassword, 10);

    // 3) update all SISWA using query builder for efficiency
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ password: hashed })
      .where('role = :role', { role: 'SISWA' })
      .andWhere('deleted_at IS NULL')
      .execute();

    const affected = result.affected ?? 0;

    if (affected === 0) {
      throw new NotFoundException('No SISWA users found to update');
    }

    // ⚠️ Jangan log password plain di production; hanya untuk debugging lokal jika perlu
    this.logger.log(`Updated ${affected} SISWA passwords to SAME new password`);

    return { updated: affected, newPassword: rawPassword };
  }

  async getUsersByRole(
    role: string,
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number,
    examId?: string,
  ) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const offset = (safePage - 1) * safeLimit;
    const normalizedRole = role.toUpperCase();

    let classId: string | null = null;

    // ✅ Ambil class_id dari relasi Exam → Subject
    if (examId) {
      const examWithSubject = await this.dataSource
        .getRepository(Exam)
        .createQueryBuilder('exam')
        .leftJoinAndSelect('exam.subject', 'subject')
        .select(['exam.id', 'subject.class_id'])
        .where('exam.id = :examId', { examId })
        .getOne();

      if (examWithSubject?.subject?.class_id) {
        classId = examWithSubject.subject.class_id;
      }
    }

    // ✅ Query user berdasarkan role, optional search dan class filter
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.role', 'user.userid', 'user.class_id', 'user.class_name'])
      .where('user.role = :role', { role: normalizedRole })
      .andWhere('user.deleted_at IS NULL')
      .orderBy(`user.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(safeLimit);

    if (search && search.trim() !== '') {
      queryBuilder.andWhere('LOWER(user.name) LIKE :search', {
        search: `%${search.trim().toLowerCase()}%`,
      });
    }

    // ✅ Filter berdasarkan class_id dari subject (jika ditemukan)
    if (classId) {
      queryBuilder.andWhere('user.class_id = :classId', { classId });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }


}
