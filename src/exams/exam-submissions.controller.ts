import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  InternalServerErrorException,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExamSubmissionService } from './exam-submission.service';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';

@Controller('exam-submissions')
@UseGuards(AuthGuard('jwt'))
export class ExamSubmissionController {
  constructor(
    private readonly examSubmissionService: ExamSubmissionService,
  ) {}

  @Get('me')
  async MySubmission(
    @Query('search') search: string = '',
    @Query('sort') sort = 'title',
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Req() req: any) {
    const studentId = req.user?.sub;
    if (!studentId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.examSubmissionService.getSubmittedExamsByStudent(
      studentId,
      search,
      sort,
      order,
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  async getSubmissionDetail(@Param('id') id: string, @Req() req: any) {
    try {
      const studentId = req.user?.sub;
      return await this.examSubmissionService.getSubmissionDetail(id, studentId);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  @Post(':examId')
  async submitExam(
    @Param('examId') examId: string,
    @Body('answers') answers: Record<string, any>,
    @Req() req: any,
  ) {
    try {
      const studentId = req.user?.sub; // ambil dari JWT
      return await this.examSubmissionService.submit({
        exam_id: examId,
        student_id: studentId,
        answers,
      } as CreateExamSubmissionDto);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get(':examId/me')
  async checkMySubmission(@Param('examId') examId: string, @Req() req: any) {
    const studentId = req.user?.sub;
    if (!studentId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.examSubmissionService.hasSubmitted(examId, studentId);
  }
}
