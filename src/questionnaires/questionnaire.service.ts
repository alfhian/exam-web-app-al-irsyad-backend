import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Questionnaire } from './entities/questionnaire.entity';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';

@Injectable()
export class QuestionnaireService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateQuestionnaireDto): Promise<Questionnaire> {
    const { data, error } = await this.supabase.client
      .from('questionnaires')
      .insert({
        ...dto,
        created_at: new Date(),
        created_by: dto.created_by,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    return data as Questionnaire;
  }

  async getDataWithPagination(
    examId: string,
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number,
  ): Promise<{ data: Questionnaire[]; meta: any }> {
    const offset = (page - 1) * limit;
    const keyword = search?.trim().toLowerCase();

    let query = this.supabase.client
      .from('questionnaires')
      .select('*', { count: 'exact' })
      .eq('exam_id', examId)
      .is('deleted_at', null)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (keyword) {
      query = query.or(
        [`question.ilike.%${keyword}%`, `type.ilike.%${keyword}%`].join(','),
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    return {
      data: (data ?? []) as Questionnaire[],
      meta: {
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  async findById(id: string): Promise<Questionnaire> {
    const { data, error } = await this.supabase.client
      .from('questionnaires')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Questionnaire ${id} not found`);
    }

    return data as Questionnaire;
  }

  async update(
    id: string,
    dto: UpdateQuestionnaireDto & { updated_by?: string },
  ): Promise<Questionnaire> {
    await this.findById(id); // memastikan ada

    const { data, error } = await this.supabase.client
      .from('questionnaires')
      .update({
        ...dto,
        updated_at: new Date(),
        updated_by: dto.updated_by,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new NotFoundException(`Failed to update questionnaire ${id}`);
    }

    return data as Questionnaire;
  }

  async softDelete(id: string, deletedBy: string): Promise<Questionnaire> {
    await this.findById(id); // memastikan ada

    const { data, error } = await this.supabase.client
      .from('questionnaires')
      .update({
        deleted_at: new Date(),
        deleted_by: deletedBy,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new NotFoundException(`Failed to delete questionnaire ${id}`);
    }

    return data as Questionnaire;
  }
}
