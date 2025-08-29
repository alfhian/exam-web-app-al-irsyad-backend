import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Choice } from './entities/choice.entity';
import { CreateChoiceDto } from './dto/create-choice.dto';
import { UpdateChoiceDto } from './dto/update-choice.dto';

@Injectable()
export class ChoiceService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateChoiceDto): Promise<Choice> {
    return this.supabase.insert<Choice>('choices', dto);
  }

  async findAll(questionId?: string): Promise<Choice[]> {
    let query = this.supabase.client
      .from('choices')
      .select('*')
      .is('deleted_at', null);

    if (questionId) query = query.eq('question_id', questionId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findById(id: string): Promise<Choice | null> {
    const { data, error } = await this.supabase.client
      .from('choices')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) return null;
    return data;
  }

  async update(id: string, dto: UpdateChoiceDto): Promise<Choice> {
    const choice = await this.findById(id);
    if (!choice) throw new NotFoundException(`Choice ${id} not found`);

    const updated = await this.supabase.update<Choice>('choices', id, dto);
    if (!updated) throw new NotFoundException(`Failed to update choice ${id}`);

    return updated;
  }

  async softDelete(id: string, deletedBy: string): Promise<Choice> {
    const choice = await this.findById(id);
    if (!choice) throw new NotFoundException(`Choice ${id} not found`);

    const deleted = await this.supabase.update<Choice>('choices', id, {
      deleted_at: new Date(),
      deleted_by: deletedBy,
    });

    if (!deleted) throw new NotFoundException(`Failed to delete choice ${id}`);
    return deleted;
  }
}
