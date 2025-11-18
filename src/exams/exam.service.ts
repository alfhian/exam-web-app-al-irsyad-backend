import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Brackets } from 'typeorm';
import { Exam } from './entities/exam.entity'
import { Questionnaire } from '../questionnaires/entities/questionnaire.entity';;
import { ExamSubmission } from './entities/exam-submission.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,

    @InjectRepository(ExamSubmission)
    private readonly examSubmissionRepository: Repository<ExamSubmission>,

    @InjectRepository(Questionnaire)
    private readonly questionnaireRepository: Repository<Questionnaire>,
  ) {}


  async create(dto: CreateExamDto): Promise<Exam> {
    const exam = this.examRepository.create({
      ...dto,
      date: new Date(dto.date),
    });
    return this.examRepository.save(exam);
  }

  async getDataWithPagination(
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number,
  ): Promise<{ data: Exam[]; meta: any }> {
    const offset = (page - 1) * limit;
    const keyword = search.trim().toLowerCase();

    const queryBuilder = this.examRepository.createQueryBuilder('exams')
      .leftJoinAndSelect('exams.subject', 'subject') // ✅ harus cocok dengan relasi di entity
      .where('exams.deleted_at IS NULL');

    if (keyword) {
      queryBuilder.andWhere(
        '(LOWER(exams.title) LIKE :keyword OR LOWER(exams.type) LIKE :keyword OR exams.date::text LIKE :keyword OR exams.duration::text LIKE :keyword OR LOWER(subject.name) LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder
      .orderBy(`exams.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
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


  async findById(id: string): Promise<Exam | null> {
    return this.examRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['subject']
    });
  }

  async update(id: string, dto: UpdateExamDto): Promise<Exam> {
    const exam = await this.findById(id);
    if (!exam) throw new NotFoundException(`Exam ${id} not found`);

    Object.assign(exam, {
      ...dto,
      date: dto.date ? new Date(dto.date) : exam.date,
    });

    return this.examRepository.save(exam);
  }

  async softDelete(id: string, deletedBy: string): Promise<Exam> {
    const exam = await this.findById(id);
    if (!exam) throw new NotFoundException(`Exam ${id} not found`);

    exam.deleted_at = new Date();
    exam.deleted_by = deletedBy;

    return this.examRepository.save(exam);
  }

  async getExamStudents(examId: string) {
    // This would need a separate exam_students table or junction table
    // For now, returning empty array as this functionality needs to be implemented
    return [];
  }

  async assignStudents(examId: string, studentIds: string[]) {
    // This would need a separate exam_students table or junction table
    // For now, returning success as this functionality needs to be implemented
    return { success: true };
  }

  async getTodayExamsWithPagination(
    studentId: string,
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number,
  ): Promise<{ data: Exam[]; meta: any }> {
    const offset = (page - 1) * limit;
    const keyword = search.trim().toLowerCase();

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const queryBuilder = this.examRepository.createQueryBuilder('exam')
      .leftJoinAndSelect('exam.subject', 'subject')
      .leftJoin('users', 'student', 'student.id = :studentId', { studentId })
      .leftJoin(
        'exam_students',
        'exam_student',
        'exam_student.exam_id = exam.id AND exam_student.student_id = student.id',
      )
      .where(
        new Brackets((qb) => {
          qb.where('exam.type = :remedialType', { remedialType: 'REMEDIAL' })
            .andWhere('exam_student.id IS NOT NULL')
            .andWhere('exam_student.deleted_at IS NULL');
        }),
      )
      .orWhere(
        new Brackets((qb) => {
          qb.where('exam.type = :regularType', { regularType: 'REGULER' })
            .andWhere('exam.deleted_at IS NULL')
            .andWhere('exam.date BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay })
            .andWhere('subject.class_id = student.class_id');
        }),
      )
      .andWhere('exam.deleted_at IS NULL'); // pastikan semua exam aktif

    if (keyword) {
      queryBuilder.andWhere(
        '(LOWER(exam.title) LIKE :keyword OR LOWER(subject.name) LIKE :keyword OR LOWER(exam.type) LIKE :keyword OR exam.date::text LIKE :keyword OR exam.duration::text LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder
      .orderBy(`exam.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
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

  async getExamQuestions(
    examId: string,
  ): Promise<{ examId: string; questions: Questionnaire[] }> {
    const exam = await this.examRepository.findOne({
      where: { id: examId, deleted_at: IsNull() },
    });

    if (!exam) {
      throw new NotFoundException(`Exam dengan ID ${examId} tidak ditemukan`);
    }

    const questions = await this.questionnaireRepository.find({
      where: { exam_id: examId, deleted_at: IsNull() },
      order: { created_at: 'ASC' },
    });

    return {
      examId,
      questions,
    };
  }

}
