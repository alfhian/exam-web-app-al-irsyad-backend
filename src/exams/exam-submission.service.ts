import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { ExamSubmission } from './entities/exam-submission.entity';
import { Questionnaire } from 'src/questionnaires/entities/questionnaire.entity';

@Injectable()
export class ExamSubmissionService {
  constructor(
    @InjectRepository(ExamSubmission)
    private readonly examSubmissionRepository: Repository<ExamSubmission>,

    @InjectRepository(Questionnaire)
    private readonly questionnaireRepository: Repository<Questionnaire>,
  ) {}

  async getSubmittedExamsByStudent(
    studentId: string,
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number,
  ): Promise<{ data: any[]; meta: any }> {
    const offset = (page - 1) * limit;
    const keyword = search?.trim().toLowerCase();

    const queryBuilder = this.examSubmissionRepository.createQueryBuilder('submission')
      .leftJoinAndSelect('submission.exam', 'exam')
      .leftJoinAndSelect('exam.subject', 'subject')
      .where('submission.student_id = :studentId', { studentId });

    if (keyword) {
      queryBuilder.andWhere(
        '(LOWER(exam.title) LIKE :keyword OR LOWER(exam.type) LIKE :keyword OR exam.date::text LIKE :keyword OR exam.duration::text LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder
      .orderBy(`submission.${sort || 'created_at'}`, order.toUpperCase() as 'ASC' | 'DESC')
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

  async getSubmissionDetail(submissionId: string, studentId: string) {
    const submission = await this.examSubmissionRepository.findOne({
      where: { id: submissionId, student_id: studentId },
      relations: ['exam', 'exam.subject'],
    });

    if (!submission) {
      throw new NotFoundException('Submission tidak ditemukan.');
    }

    const answerList = submission.answers || [];

    // Ambil semua question_id unik dari jawaban
    const questionIds = [...new Set(answerList.map((a) => a.question_id))];

    // Ambil semua pertanyaan terkait dari tabel questionnaire
    const questions = await this.questionnaireRepository.findBy({
      id: questionIds.length > 0 ? In(questionIds) : undefined,
    });

    // Gabungkan pertanyaan dengan jawaban
    const answersWithQuestions = answerList.map((a) => ({
      ...a,
      question: questions.find((q) => q.id === a.question_id) || null,
    }));

    return {
      ...submission,
      answers: answersWithQuestions,
    };
  }


  async hasSubmitted(examId: string, studentId: string): Promise<{ submitted: boolean }> {
    try {
      const submission = await this.examSubmissionRepository.findOne({
        where: { exam_id: examId, student_id: studentId },
        select: ['id']
      });

      return { submitted: !!submission };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async submit(dto: CreateExamSubmissionDto): Promise<ExamSubmission> {
    const { exam_id, student_id, answers, created_by } = dto;

    console.log('📦 body.answers isArray?', Array.isArray(answers));
    // basic validation
    if (!exam_id) throw new BadRequestException('exam_id is required');
    if (!student_id) throw new BadRequestException('student_id is required');
    if (!Array.isArray(answers))
      throw new BadRequestException('answers must be an array');

    // Check existing submissions
    const existing = await this.examSubmissionRepository.findOne({
      where: { exam_id, student_id },
      select: ['id']
    });

    if (existing) {
      throw new BadRequestException('Anda sudah pernah mengirimkan jawaban untuk ujian ini.');
    }

    // Create new submission
    const submission = this.examSubmissionRepository.create({
      exam_id,
      student_id,
      answers,
      created_by,
    });

    return this.examSubmissionRepository.save(submission);
  }
}
