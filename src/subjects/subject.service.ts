import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>
  ) {}

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const subject = this.subjectRepository.create(dto);
    return this.subjectRepository.save(subject);
  }

  async getDataWithPagination(
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number
  ): Promise<{ data: Subject[]; meta: any }> {
    const offset = (page - 1) * limit;
    const keyword = search.trim().toLowerCase();

    const queryBuilder = this.subjectRepository.createQueryBuilder('subject')
      .where('subject.deleted_at IS NULL');

    if (keyword) {
      queryBuilder.andWhere(
        '(LOWER(subject.name) LIKE :keyword OR LOWER(subject.description) LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder
      .orderBy(`subject.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
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

  async getDataOnly(): Promise<{ data: Subject[]; meta: any }> {
    const data = await this.subjectRepository.find({
      where: { deleted_at: IsNull() },
      order: { class_id: 'ASC', name: 'ASC' }
    });

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  async findById(id: string): Promise<Subject | null> {
    return this.subjectRepository.findOne({
      where: { id, deleted_at: IsNull() }
    });
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findById(id);
    if (!subject) throw new NotFoundException(`Subject ${id} not found`);

    Object.assign(subject, dto);
    return this.subjectRepository.save(subject);
  }

  async softDelete(id: string, deletedBy: string): Promise<Subject> {
    const subject = await this.findById(id);
    if (!subject) throw new NotFoundException(`Subject ${id} not found`);

    subject.deleted_at = new Date();
    subject.deleted_by = deletedBy;

    return this.subjectRepository.save(subject);
  }
}
