import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TeacherExamsService {
  constructor(private readonly supabase: SupabaseService) {}

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
    const { data: submissions, error: subErr } = await this.supabase.client
      .from('exam_submissions')
      .select('exam_id, score')
      .not('exam_id', 'is', null);

    if (subErr) throw new Error(`Supabase error (exam_submissions): ${subErr.message}`);

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
    let query = this.supabase.client
      .from('exams')
      .select(
        `
        id,
        title,
        type,
        date,
        duration,
        subjects ( name ),
        exam_submissions ( count )
      `,
        { count: 'exact' },
      )
      .in('id', examIds)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    // Filter pencarian
    if (search) {
      const keyword = search.trim().toLowerCase();
      query = query.or(
        `title.ilike.%${keyword}%,type.ilike.%${keyword}%,subjects.name.ilike.%${keyword}%`,
      );
    }

    const { data, count, error } = await query;
    if (error)
      throw new Error(`Supabase error (teacher exams): ${error.message}`);

    // Tambahkan kolom unscored_count
    const examsWithUnscored = data.map((exam) => ({
      ...exam,
      unscored_count: unscoredMap[exam.id] ?? 0,
    }));

    return {
      data: examsWithUnscored,
      meta: {
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  /**
   * 🔹 Ambil daftar siswa yang sudah submit ujian tertentu
   * ✅ Urutkan submission belum di-scoring (score null) ke atas
   */
  async getStudentsByExam(examId: string, search = '', page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { data, count, error } = await this.supabase.client
      .from('exam_submissions')
      .select(
        `
        id,
        created_at,
        student_id,
        score,
        users:student_id ( id, name ),
        exams:exam_id ( id, title, type, date )
      `,
        { count: 'exact' },
      )
      .eq('exam_id', examId)
      .order('score', { ascending: true, nullsFirst: true }) // 🔹 yang belum discoring tampil duluan
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error)
      throw new Error(`Supabase error (students submissions): ${error.message}`);

    // Filter berdasarkan nama siswa
    const filteredData = search
      ? data.filter((s) => {
          const user = Array.isArray(s.users) ? s.users[0] : s.users;
          return user?.name?.toLowerCase().includes(search.toLowerCase());
        })
      : data;

    return {
      data: filteredData,
      meta: {
        total: count ?? filteredData.length,
        page,
        limit,
        totalPages: Math.ceil((count ?? filteredData.length) / limit),
      },
    };
  }

  /**
   * 🔹 Ambil detail ujian yang disubmit siswa
   */
  async getSubmissionDetail(submissionId: string) {
    const { data: submission, error: subErr } = await this.supabase.client
      .from('exam_submissions')
      .select(
        `
        id,
        exam_id,
        student_id,
        score,
        created_at,
        users:student_id ( id, name ),
        exams:exam_id ( id, title, type, date ),
        answers
      `,
      )
      .eq('id', submissionId)
      .single();

    if (subErr)
      throw new Error(`Supabase error (submission): ${subErr.message}`);

    if (!submission)
      throw new NotFoundException(`Submission ${submissionId} not found.`);

    const { data: questions, error: qErr } = await this.supabase.client
      .from('questionnaires')
      .select('id, question, type, options, answer')
      .eq('exam_id', submission.exam_id)
      .order('index', { ascending: true });

    if (qErr)
      throw new Error(`Supabase error (questions): ${qErr.message}`);

    const mappedQuestions = questions.map((q) => {
      const ans = submission.answers?.find((a) => a.question_id === q.id);
      return {
        ...q,
        student_answer: ans?.answer ?? null,
        is_correct: ans?.is_correct ?? null,
      };
    });

    return {
      id: submission.id,
      created_at: submission.created_at,
      score: submission.score,
      exam: submission.exams,
      student: submission.users,
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
    const { data: existing, error: fetchErr } = await this.supabase.client
      .from('exam_submissions')
      .select('id, answers, score')
      .eq('id', submissionId)
      .single();

    if (fetchErr || !existing)
      throw new NotFoundException('Submission not found');

    const updatedAnswers = (existing.answers || []).map((a) => {
      const match = scores.find((s) => s.question_id === a.question_id);
      return match ? { ...a, is_correct: match.is_correct } : a;
    });

    const { data, error: updateErr } = await this.supabase.client
      .from('exam_submissions')
      .update({
        answers: updatedAnswers,
        score: typeof totalScore === 'number' ? totalScore : existing.score,
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateErr)
      throw new Error(`Supabase error (update scoring): ${updateErr.message}`);

    return {
      message: 'Scoring updated successfully',
      submission_id: submissionId,
      score: data.score,
    };
  }
}
