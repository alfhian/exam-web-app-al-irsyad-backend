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

  async findAll(): Promise<Subject[]> {
    const { data, error } = await this.supabase.client
      .from('subjects')
      .select('*')
      .is('deleted_at', null);

    if (error) throw new Error(error.message);
    return data ?? [];
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
