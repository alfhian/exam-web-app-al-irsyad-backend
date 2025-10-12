import {
  Controller,
  Get,
  Query,
  InternalServerErrorException,
  UseGuards,
  Param,
  Patch,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeacherExamsService } from './teacher-exam.service';

@Controller('teacher-exams')
@UseGuards(AuthGuard('jwt'))
export class TeacherExamsController {
  constructor(
    private readonly teacherExamService: TeacherExamsService,
  ) {}

  /**
   * 🔹 GET /api/teacher-exams
   * Daftar ujian yang sudah pernah dikerjakan siswa
   * + Jumlah submission belum discoring (unscored_count)
   */
  @Get()
  async getSubmittedExams(
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.teacherExamService.getSubmittedExamsByTeacher(
      search,
      sort,
      order,
      Number(page),
      Number(limit),
    );
  }

  // ✅ Ambil detail jawaban ujian siswa
  @Get('submission/:submissionId')
  async getSubmissionDetail(@Param('submissionId') submissionId: string) {
    return this.teacherExamService.getSubmissionDetail(submissionId);
  }

  // ✅ Simpan hasil penilaian guru
  @Patch('submission/:submissionId/scoring')
  async updateSubmissionScore(
    @Param('submissionId') submissionId: string,
    @Body()
    body: {
      scores: { question_id: string; is_correct: boolean }[];
      totalScore?: number;
    },
  ) {
    return this.teacherExamService.updateSubmissionScore(
      submissionId,
      body.scores,
      body.totalScore,
    );
  }

  /**
   * 🔹 Ambil daftar siswa yang mengerjakan ujian tertentu
   */
  @Get(':examId/students')
  async getStudentsByExam(
    @Param('examId') examId: string,
    @Query('search') search = '',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    try {
      return await this.teacherExamService.getStudentsByExam(
        examId,
        search,
        Number(page),
        Number(limit),
      );
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
