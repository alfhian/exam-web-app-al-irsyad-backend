import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, In } from 'typeorm';
import { ExamSubmission } from './entities/exam-submission.entity';
import { Exam } from './entities/exam.entity';
import { Questionnaire } from 'src/questionnaires/entities/questionnaire.entity';

@Injectable()
export class TeacherExamsService {
  constructor(
    @InjectRepository(ExamSubmission)
    private readonly examSubmissionRepository: Repository<ExamSubmission>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(Questionnaire)
    private readonly questionnaireRepository: Repository<Questionnaire>,
  ) {}

  /**
   * 🔹 Ambil daftar ujian yang sudah pernah dikerjakan siswa
   * ✅ Tambahkan jumlah submission yang belum di-scoring (unscored_count)
   */
  async getSubmittedExamsByTeacher(
    search = '',
    sort = 'date',
    order: 'asc' | 'desc' = 'desc',
    page = 1,
    limit = 10,
  ) {
    const offset = (page - 1) * limit;

    // Ambil semua exam_submissions dengan exam_id dan score
    const submissions = await this.examSubmissionRepository.find({
      select: ['exam_id', 'score'],
      where: { exam_id: Not(IsNull()) }
    });

    const examIds = [...new Set(submissions.map((s) => s.exam_id))];
    if (examIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    // Hitung jumlah submission belum dinilai per exam
    const unscoredMap = submissions.reduce((acc, curr) => {
      if (!acc[curr.exam_id]) acc[curr.exam_id] = 0;
      if (curr.score === null || curr.score === undefined) acc[curr.exam_id]++;
      return acc;
    }, {});

    // Ambil daftar exam
    const queryBuilder = this.examRepository.createQueryBuilder('exam')
      .leftJoinAndSelect('exam.subject', 'subjects')
      .leftJoin('exam_submissions', 'submission', 'submission.exam_id = exam.id')
      .addSelect('COUNT(submission.id)', 'submission_count')
      .where('exam.id IN (:...examIds)', { examIds })
      .groupBy('exam.id, subjects.id')
      .orderBy(`exam.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);

    // Filter pencarian
    if (search) {
      const keyword = search.trim().toLowerCase();
      queryBuilder.andWhere(
        '(LOWER(exam.title) LIKE :keyword OR LOWER(exam.type) LIKE :keyword OR LOWER(subjects.name) LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    // Tambahkan kolom unscored_count
    const examsWithUnscored = data.map((exam) => ({
      ...exam,
      unscored_count: unscoredMap[exam.id] ?? 0,
    }));

    return {
      data: examsWithUnscored,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 🔹 Ambil daftar siswa yang sudah submit ujian tertentu
   * ✅ Urutkan submission belum di-scoring (score null) ke atas
   */
  async getStudentsByExam(examId: string, search = '', page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const queryBuilder = this.examSubmissionRepository.createQueryBuilder('submission')
      .leftJoinAndSelect('submission.student', 'users')
      .leftJoinAndSelect('submission.exam', 'exams')
      .where('submission.exam_id = :examId', { examId })
      .orderBy('submission.score', 'ASC', 'NULLS FIRST')
      .addOrderBy('submission.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Filter berdasarkan nama siswa
    const filteredData = search
      ? data.filter((s) => {
          return s.student?.name?.toLowerCase().includes(search.toLowerCase());
        })
      : data;

    return {
      data: filteredData,
      meta: {
        total: search ? filteredData.length : total,
        page,
        limit,
        totalPages: Math.ceil((search ? filteredData.length : total) / limit),
      },
    };
  }

  /**
   * 🔹 Ambil detail ujian yang disubmit siswa
   */
  async getSubmissionDetail(submissionId: string) {
    const submission = await this.examSubmissionRepository.findOne({
      where: { id: submissionId },
      relations: ['student', 'exam', 'exam.subject']
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found.`);
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/prefer-for-of, @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-empty-block
    const mappedQuestions = questions.map((q) => {
      const ans = submission.answers?.find((a) => a.question_id === q.id);
      return {
        ...q,
        student_answer: ans?.answer ?? null,
        is_correct: ans?.is_correct ?? null,
        answers: answersWithQuestions,
      };
    });

    return {
      id: submission.id,
      created_at: submission.created_at,
      score: submission.score,
      exam: {
        ...submission.exam,
        subject: submission.exam.subject || null,
      },
      student: submission.student,
      questions: mappedQuestions,
    };
  }

  /**
   * ✅ Simpan hasil penilaian guru + total skor
   */
  async updateSubmissionScore(
    submissionId: string,
    scores: { question_id: string; is_correct: boolean }[],
    totalScore?: number,
  ) {
    const existing = await this.examSubmissionRepository.findOne({
      where: { id: submissionId },
      select: ['id', 'answers', 'score']
    });

    if (!existing) {
      throw new NotFoundException('Submission not found');
    }

    const updatedAnswers = (existing.answers || []).map((a) => {
      const match = scores.find((s) => s.question_id === a.question_id);
      return match ? { ...a, is_correct: match.is_correct } : a;
    });

    existing.answers = updatedAnswers;
    if (typeof totalScore === 'number') {
      existing.score = totalScore;
    }

    const data = await this.examSubmissionRepository.save(existing);

    return {
      message: 'Scoring updated successfully',
      submission_id: submissionId,
      score: data.score,
    };
  }
}
