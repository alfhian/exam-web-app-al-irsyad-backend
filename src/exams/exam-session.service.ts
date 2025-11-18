import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { ExamSession } from './entities/exam-session.entity';
import { ExamSubmission } from './entities/exam-submission.entity';

@Injectable()
export class ExamSessionService {
  constructor(
    @InjectRepository(ExamSession)
    private readonly examSessionRepository: Repository<ExamSession>,
    private readonly dataSource: DataSource,
  ) {}

  async startSession(examId: string, studentId: string) {
    const session = this.examSessionRepository.create({
      exam_id: examId,
      student_id: studentId,
    });
    return this.examSessionRepository.save(session);
  }

  async incrementTabSwitch(sessionId: string) {
    const session = await this.examSessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');

    session.tab_switch_count = (session.tab_switch_count || 0) + 1;
    return this.examSessionRepository.save(session);
  }

  async finishSession(sessionId: string) {
    const session = await this.examSessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new Error(`Session dengan id ${sessionId} tidak ditemukan`);

    session.finished = true;
    return this.examSessionRepository.save(session);
  }

  async uploadVideo(sessionId: string, file: Express.Multer.File, user?: any) {
    try {
      if (!file) throw new InternalServerErrorException('No file uploaded');

      const uploadDir = path.resolve('uploads', 'recordings');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const rawFile = path.join(uploadDir, `raw-${sessionId}-${randomUUID()}.webm`);
      await fs.promises.writeFile(rawFile, file.buffer);

      const compressedFileName = `session-${sessionId}-${randomUUID()}.mp4`;
      const compressedFilePath = path.join(uploadDir, compressedFileName);

      console.log('🎬 Compressing video...');
      await new Promise((resolve, reject) => {
        ffmpeg(rawFile)
          .outputOptions([
            '-vcodec libx264',
            '-preset veryfast',
            '-crf 28',       // quality–size balance (lower = better quality)
            '-b:a 96k',
            '-vf scale=640:-1',
          ])
          .save(compressedFilePath)
          .on('end', resolve)
          .on('error', reject);
      });

      // 🧹 Hapus file mentah
      fs.unlinkSync(rawFile);

      // 🗄️ Simpan metadata di DB
      const submissionRepo = this.dataSource.getRepository(ExamSubmission);
      const submission = await submissionRepo.findOne({ where: { exam_id: sessionId } });
      if (submission) {
        submission.file_name = compressedFileName;
        submission.file_path = `/uploads/recordings/${compressedFileName}`;
        submission.updated_by = user?.id || null;
        submission.updated_at = new Date();
        await submissionRepo.save(submission);
      }

      return {
        success: true,
        fileName: compressedFileName,
        fileUrl: `/uploads/recordings/${compressedFileName}`,
        message: '✅ Video uploaded & compressed successfully',
      };
    } catch (err) {
      console.error('❌ Video compression failed:', err);
      throw new InternalServerErrorException('Failed to upload or compress video');
    }
  }

}
