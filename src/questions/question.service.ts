import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Question } from './entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateQuestionDto): Promise<Question> {
    return this.supabase.insert<Question>('questions', {
      ...dto,
      type: dto.type as Question['type'],
    });
  }

  async findAll(examId?: string): Promise<Question[]> {
    let query = this.supabase.client
      .from('questions')
      .select('*')
      .is('deleted_at', null);

    if (examId) query = query.eq('exam_id', examId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findById(id: string): Promise<Question | null> {
    const { data, error } = await this.supabase.client
      .from('questions')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) return null;
    return data;
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findById(id);
    if (!question) throw new NotFoundException(`Question ${id} not found`);

    const updated = await this.supabase.update<Question>('questions', id, {
      ...dto,
      type: dto.type as Question['type'],
    });
    if (!updated) throw new NotFoundException(`Failed to update question ${id}`);

    return updated;
  }

  async softDelete(id: string, deletedBy: string): Promise<Question> {
    const question = await this.findById(id);
    if (!question) throw new NotFoundException(`Question ${id} not found`);

    const deleted = await this.supabase.update<Question>('questions', id, {
      deleted_at: new Date(),
      deleted_by: deletedBy,
    });

    if (!deleted) throw new NotFoundException(`Failed to delete question ${id}`);
    return deleted;
  }
}
