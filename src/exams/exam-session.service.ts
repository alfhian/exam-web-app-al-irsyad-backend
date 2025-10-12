import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as multer from 'multer';
import { randomUUID } from 'crypto';
import { File as MulterFile } from 'multer';

@Injectable()
export class ExamSessionService {
  constructor(private readonly supabase: SupabaseService) {}

  async startSession(examId: string, studentId: string) {
    const { data, error } = await this.supabase.client
      .from('exam_sessions')
      .insert({ exam_id: examId, student_id: studentId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async incrementTabSwitch(sessionId: string) {
    // Fetch current tab_switch_count
    const { data: session, error: fetchError } = await this.supabase.client
      .from('exam_sessions')
      .select('tab_switch_count')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const currentCount = session?.tab_switch_count ?? 0;

    // Update with incremented value
    const { data, error } = await this.supabase.client
      .from('exam_sessions')
      .update({ tab_switch_count: currentCount + 1 })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }


  async finishSession(sessionId: string) {
    const { data, error } = await this.supabase.client
        .from('exam_sessions')
        .update({ finished: true })
        .eq('id', sessionId)
        .select(); // ⚡ jangan pakai .single()

    if (error) {
        throw new Error(`Supabase error (finishSession): ${error.message}`);
    }

    // Supabase selalu balikin array di .select()
    if (!data || data.length === 0) {
        throw new Error(`Session dengan id ${sessionId} tidak ditemukan atau tidak diupdate`);
    }

    // balikin baris pertama
    return data[0];
	}
  async uploadVideo(sessionId: string, file: MulterFile) {
    const fileName = `session-${sessionId}-${randomUUID()}.webm`;
		console.log('Uploading file:', fileName);
		

    // ✅ upload ke bucket "exam-recordings"
    const { error: uploadError } = await this.supabase.client.storage
      .from('exam-recordings')
      .upload(fileName, file.buffer, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (uploadError) {
      throw new InternalServerErrorException(
        `Supabase upload error: ${uploadError.message}`,
      );
    }

    // 🔐 Generate signed URL (valid 24 jam = 86400 detik)
    const { data: signedData, error: signedError } =
      await this.supabase.client.storage
        .from('exam-recordings')
        .createSignedUrl(fileName, 60 * 60 * 24);

    if (signedError) {
      throw new InternalServerErrorException(
        `Supabase signed URL error: ${signedError.message}`,
      );
    }

    return {
      fileName,
      signedUrl: signedData.signedUrl,
      expiresIn: '24h',
    };
  }

}
