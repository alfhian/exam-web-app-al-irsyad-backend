import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Exam } from './entities/exam.entity';
import { CreateExamDto } from './dto/create-exam.dto';
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

  async findAll(): Promise<Exam[]> {
    const { data, error } = await this.supabase.client
      .from('exams')
      .select('*')
      .is('deleted_at', null);

    if (error) throw new Error(error.message);
    return data ?? [];
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
}
