import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Exam } from './entities/exam.entity';
import { ExamSubmission } from './entities/exam-submission.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateExamDto): Promise<Exam> {
    return this.supabase.insert<Exam>('exams', {
      ...dto,
      date: new Date(dto.date),
    });
  }

  async getDataWithPagination(
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number
  ): Promise<{ data: Exam[]; meta: any }> {
    const offset = (page - 1) * limit;

    const keyword = search.trim().toLowerCase();

    const keywordFilter = keyword?.trim();
    const filters: string[] = [];

    if (keywordFilter) {
      filters.push(`title.ilike.%${keywordFilter}%`);

      if (!isNaN(Date.parse(keywordFilter))) {
        filters.push(`date::text.ilike.%${keywordFilter}%`);
      }

      if (!isNaN(Number(keywordFilter))) {
        filters.push(`duration::text.ilike.%${keywordFilter}%`);
      }
    }

    let query = this.supabase.client
      .from('exams')
      .select('*, subjects(name)', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
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
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  async findById(id: string): Promise<Exam | null> {
    const { data, error } = await this.supabase.client
      .from('exams')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) return null;
    return data;
  }

  async update(id: string, dto: UpdateExamDto): Promise<Exam> {
    const exam = await this.findById(id);
    if (!exam) throw new NotFoundException(`Exam ${id} not found`);

    const updated = await this.supabase.update<Exam>('exams', id, {
      ...dto,
      date: dto.date ? new Date(dto.date) : undefined,
    });
    if (!updated) throw new NotFoundException(`Failed to update exam ${id}`);

    return updated;
  }

  async softDelete(id: string, deletedBy: string): Promise<Exam> {
    const exam = await this.findById(id);
    if (!exam) throw new NotFoundException(`Exam ${id} not found`);

    const deleted = await this.supabase.update<Exam>('exams', id, {
      deleted_at: new Date(),
      deleted_by: deletedBy,
    });

    if (!deleted) throw new NotFoundException(`Failed to delete exam ${id}`);
    return deleted;
  }

  async getExamStudents(examId: string) {
    const { data, error } = await this.supabase.client
      .from('exam_students')
      .select('student_id')
      .eq('exam_id', examId);

    if (error) throw new Error(error.message);
    return data.map((d) => d.student_id);
  }

  async assignStudents(examId: string, studentIds: string[]) {
    // hapus semua siswa lama dulu
    const { error: delError } = await this.supabase.client
      .from('exam_students')
      .delete()
      .eq('exam_id', examId);

    if (delError) throw new BadRequestException(delError.message);

    // insert siswa baru
    const { error: insError } = await this.supabase.client
      .from('exam_students')
      .insert(
        studentIds.map((sid) => ({
          exam_id: examId,
          student_id: sid,
        })),
      );

    if (insError) throw new BadRequestException(insError.message);

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

    // Ambil hari ini dalam format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Buat rentang waktu (start dan end of day)
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    // 🔎 1. Ambil class_id dari siswa
    const { data: student, error: studentError } = await this.supabase.client
      .from('users')
      .select('class_id')
      .eq('id', studentId)
      .single();

    if (studentError) {
      throw new Error(`Supabase error (students): ${studentError.message}`);
    }

    if (!student) {
      throw new Error(`Student with id ${studentId} not found`);
    }

    const classId = student.class_id;

    // 2️⃣ Ambil semua subject.id berdasarkan class_id
    const { data: subjects, error: subjectsError } = await this.supabase.client
      .from('subjects')
      .select('id')
      .eq('class_id', classId);

    if (subjectsError) {
      throw new Error(`Supabase error (subjects): ${subjectsError.message}`);
    }
    if (!subjects || subjects.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const subjectIds = subjects.map((s) => s.id);

    const filters: string[] = [];
    if (keyword) {
      filters.push(`title.ilike.%${keyword}%`);

      if (!isNaN(Date.parse(keyword))) {
        filters.push(`date::text.ilike.%${keyword}%`);
      }

      if (!isNaN(Number(keyword))) {
        filters.push(`duration::text.ilike.%${keyword}%`);
      }
    }

    let query = this.supabase.client
      .from('exams')
      .select('*, subjects(name)', { count: 'exact' })
      .gte('date', startOfDay) // ✅ ambil >= jam 00:00 hari ini
      .lte('date', endOfDay)   // ✅ ambil <= jam 23:59 hari ini
      .in('subject_id', subjectIds)
      .order(sort, { ascending: order === 'asc' })
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
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }


  async getExamQuestions(examId: string) {
    const { data, error } = await this.supabase.client
      .from('questionnaires')
      .select('*') // kalau ada tabel options untuk pilihan ganda
      .eq('exam_id', examId)
      // .order('number', { ascending: true }); // urut berdasarkan nomor soal

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return {
      examId,
      questions: data,
    };
  }

}
