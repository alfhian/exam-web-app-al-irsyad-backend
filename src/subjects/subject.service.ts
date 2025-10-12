import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Subject } from './entities/subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateSubjectDto): Promise<Subject> {
    return this.supabase.insert<Subject>('subjects', dto);
  }

  async getDataWithPagination(
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number
  ): Promise<{ data: Subject[]; meta: any }> {
    const offset = (page - 1) * limit;

    const keyword = search.trim().toLowerCase();

    const { data, error, count } = await this.supabase.client
      .from('subjects')
      .select('*', { count: 'exact' })
      .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

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

  async getDataOnly(): Promise<{ data: Subject[]; meta: any }> {
    const { data, error, count } = await this.supabase.client
      .from('subjects')
      .select('*', { count: 'exact' })
      .order('class_id', { ascending: true})
      .order('name', { ascending: true});

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return {
      data,
      meta: {
        total: count,
      },
    };
  }

  async findById(id: string): Promise<Subject | null> {
    const { data, error } = await this.supabase.client
      .from('subjects')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) return null;
    return data;
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findById(id);
    if (!subject) throw new NotFoundException(`Subject ${id} not found`);

    const updated = await this.supabase.update<Subject>('subjects', id, dto);
    if (!updated) throw new NotFoundException(`Failed to update subject ${id}`);

    return updated;
  }

  async softDelete(id: string, deletedBy: string): Promise<Subject> {
    const subject = await this.findById(id);
    if (!subject) throw new NotFoundException(`Subject ${id} not found`);

    const deleted = await this.supabase.update<Subject>('subjects', id, {
      deleted_at: new Date(),
      deleted_by: deletedBy,
    });

    if (!deleted) throw new NotFoundException(`Failed to delete subject ${id}`);
    return deleted;
  }
}
