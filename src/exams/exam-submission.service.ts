import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { ExamSubmission } from './entities/exam-submission.entity';

@Injectable()
export class ExamSubmissionService {
  constructor(private readonly supabase: SupabaseService) {}

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
    const filters: string[] = [];

    if (keyword) {
      filters.push(`exams.title.ilike.%${keyword}%`);
      filters.push(`exams.type.ilike.%${keyword}%`);

      if (!isNaN(Date.parse(keyword))) {
        filters.push(`exams.date::text.ilike.%${keyword}%`);
      }

      if (!isNaN(Number(keyword))) {
        filters.push(`exams.duration::text.ilike.%${keyword}%`);
      }
    }

    let query = this.supabase.client
      .from('exam_submissions')
      .select(
        `
        id,
        score,
        created_at,
        exam:exams (
          id,
          title,
          type,
          date,
          duration,
          subject:subjects(name)
        )
        `,
        { count: 'exact' },
      )
      .eq('student_id', studentId)
      .order(sort || 'created_at', { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (filters.length > 0) {
      query = query.or(filters.join(','));
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return {
      data,
      meta: {
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }


  async getSubmissionDetail(submissionId: string, studentId: string) {
    const { data: submission, error } = await this.supabase.client
      .from('exam_submissions')
      .select(
        `
        id,
        answers,
        created_at,
        exams (
          id,
          title,
          type,
          date,
          duration,
          subjects(name)
        )
      `
      )
      .eq('id', submissionId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!submission) {
      throw new NotFoundException('Submission tidak ditemukan.');
    }

    // 2️⃣ Ambil semua question_id dari answers
    const questionIds = (submission.answers || []).map((a) => a.question_id);

    let questions: { id: any; question: any }[] = [];
    if (questionIds.length > 0) {
      const { data: qData, error: qError } = await this.supabase.client
        .from('questionnaires')
        .select('id, question')
        .in('id', questionIds);

      if (qError) {
        throw new Error(`Supabase error: ${qError.message}`);
      }

      questions = qData || [];
    }

    // 3️⃣ Gabungkan answers dengan pertanyaan
    const answersWithQuestions = (submission.answers || []).map((a) => ({
      ...a,
      question: questions.find((q) => q.id === a.question_id)?.question || null,
    }));

    return {
      ...submission,
      answers: answersWithQuestions,
    };
  }


	async hasSubmitted(examId: string, studentId: string): Promise<{ submitted: boolean }> {
    try {
      const { data, error } = await this.supabase.client
        .from('exam_submissions')
        .select('id')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .limit(1);

      if (error) {
        throw new InternalServerErrorException(
          `Supabase error (check submission): ${error.message}`,
        );
      }

      // jika ada data → berarti sudah submit
      return { submitted: data.length > 0 };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async submit(dto: CreateExamSubmissionDto): Promise<ExamSubmission> {
    const { exam_id, student_id, answers } = dto;

    // basic validation
    if (!exam_id) throw new BadRequestException('exam_id is required');
    if (!student_id) throw new BadRequestException('student_id is required');
    if (!Array.isArray(answers))
      throw new BadRequestException('answers must be an array');

    // 1) Check existing submissions safely (returns array)
    const { data: existingRows, error: existingError } = await this.supabase.client
      .from('exam_submissions')
      .select('id')
      .eq('exam_id', exam_id)
      .eq('student_id', student_id)
      .limit(1); // limit to avoid multiple-row error

    if (existingError) {
      throw new InternalServerErrorException(
        `Supabase error (check existing): ${existingError.message}`,
      );
    }

    // existingRows is an array; check length
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      throw new BadRequestException(
        'Anda sudah pernah mengirimkan jawaban untuk ujian ini.',
      );
    }

    // 2) Insert new submission
    // pass an array to .insert(...) — Supabase returns an array in data
    const { data: insertData, error: insertError } = await this.supabase.client
      .from('exam_submissions')
      .insert([{ exam_id, student_id, answers }])
      .select(); // no .single() to avoid the "single" JSON error

    if (insertError) {
      // better error mapping for duplicate key constraint
      const msg = insertError.message || '';
      if (insertError.code === '23505' || msg.toLowerCase().includes('duplicate')) {
        throw new BadRequestException('Anda sudah pernah mengirimkan jawaban untuk ujian ini.');
      }
      throw new InternalServerErrorException(
        `Supabase error (insert): ${insertError.message}`,
      );
    }

    // insertData is an array (even for single insert); return first item
    const inserted = Array.isArray(insertData) ? insertData[0] : insertData;

    if (!inserted) {
      throw new InternalServerErrorException('Insert succeeded but no data returned');
    }

    return inserted as ExamSubmission;
  }

}
