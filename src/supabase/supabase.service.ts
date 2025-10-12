// src/supabase/supabase.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { supabase } from './supabase.client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly _client: SupabaseClient;

  constructor() {
    this._client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  get storage() {
    return this.client.storage;
  }


  public get client(): SupabaseClient {
    return this._client;
  }

  async findAll<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select('*')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true });
      
    if (error) {
      this.logger.error(`findAll error: ${error.message}`);
      throw error;
    }
    return data as T[];
  }

  async findByNisNik<T>(table: string, userid: string | number): Promise<T | null> {
    const { data, error, count } = await supabase.from(table).select('*').eq('userid', String(userid)).limit(1);
    if (error) {
      this.logger.error(`findByNisNik error: ${error.message}`);
      throw error;
    }
    console.log('Query count:', count);
    console.log('Query data:', data);
    return data as T;
  }

  async findByUserId<T>(table: string, id: string | number): Promise<T | null> {
    const { data, error, count } = await supabase.from(table).select('*').eq('id', String(id)).limit(1);
    if (error) {
      this.logger.error(`findByUserId error: ${error.message}`);
      throw error;
    }
    console.log('Query count:', count);
    console.log('Query data:', data);
    return data as T;
  }

  async insert<T>(table: string, payload: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).insert(payload).single();
    if (error) {
      this.logger.error(`insert error: ${error.message}`);
      throw error;
    }
    return data as T;
  }

  async update<T>(table: string, id: string | number, payload: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().maybeSingle();
    if (error) {
      this.logger.error(`update error: ${error.message}`);
      throw error;
    }
    return data as T;
  }

  async updateAllByRole<T>(table: string, role: string, payload: Partial<T>): Promise<number> {
    const { data, error } = await this.client
      .from(table)
      .update(payload)
      .eq('role', role)
      .select(); // pastikan pakai .select() agar data dikembalikan

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data?.length ?? 0;
  }


  

  async delete(table: string, id: string | number): Promise<boolean> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      this.logger.error(`delete error: ${error.message}`);
      throw error;
    }
    return true;
  }
}
