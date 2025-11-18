import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  Query,
  InternalServerErrorException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamStudentsService } from './exam-student.service';
import { Exam } from './entities/exam.entity';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('exams')
@UseGuards(AuthGuard('jwt'))
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly examStudentsService: ExamStudentsService,
  ) {}

  // ------------------------------
  // CREATE EXAM
  // ------------------------------
  @Post()
  async create(@Body() body: Partial<Exam>, @Req() req: Request): Promise<Exam> {
    const createdBy = (req as any).user['sub'];

    if (
      !body.title ||
      !body.date ||
      !body.duration ||
      !body.subject_id ||
      !body.type
    ) {
      throw new BadRequestException(
        'Missing required fields: title, date, duration, subject, or type',
      );
    }

    const formattedDate =
      typeof body.date === 'string'
        ? body.date
        : body.date instanceof Date
        ? body.date.toISOString()
        : '';

    return this.examService.create({
      title: body.title,
      type: body.type,
      date: formattedDate,
      duration: body.duration,
      notes: body.notes,
      subject_id: body.subject_id,
      created_by: createdBy,
    });
  }

  // ------------------------------
  // GET ALL EXAMS (WITH PAGINATION)
  // ------------------------------
  @Get()
  async getAll(
    @Query('search') search: string = '',
    @Query('sort') sort = 'title',
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    try {
      return await this.examService.getDataWithPagination(
        search,
        sort,
        order,
        Number(page),
        Number(limit),
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // ------------------------------
  // GET TODAY EXAMS
  // ------------------------------
  @Get('today')
  async getToday(
    @Req() req: Request,
    @Query('search') search: string = '',
    @Query('sort') sort = 'title',
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userlogin = (req as any).user['sub'];
    try {
      return await this.examService.getTodayExamsWithPagination(
        userlogin,
        search,
        sort,
        order,
        Number(page),
        Number(limit),
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // ------------------------------
  // GET ONE EXAM BY ID
  // ------------------------------
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examService.findById(id);
  }

  // ------------------------------
  // GET EXAM QUESTIONS
  // ------------------------------
  @Get(':id/questions')
  async getExamQuestions(@Param('id') examId: string) {
    try {
      return await this.examService.getExamQuestions(examId);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // ------------------------------
  // UPDATE EXAM
  // ------------------------------
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examService.update(id, dto);
  }

  // ------------------------------
  // SOFT DELETE EXAM
  // ------------------------------
  @Delete(':id')
  softDelete(@Param('id') id: string, @Body('deletedBy') deletedBy: string) {
    return this.examService.softDelete(id, deletedBy);
  }

  // ------------------------------
  // GET EXAM STUDENTS
  // ------------------------------
  @Get(':id/students')
  async getStudents(@Param('id') examId: string) {
    try {
      return await this.examStudentsService.getExamStudents(examId);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // ------------------------------
  // ASSIGN STUDENTS TO EXAM
  // ------------------------------
  @Post(':id/students')
  async assignStudents(
    @Param('id') examId: string,
    @Body('studentIds') studentIds: string[],
    @Req() req: any,
  ) {
    const createdBy = req.user?.sub;

    if (!studentIds?.length) {
      throw new BadRequestException('studentIds tidak boleh kosong');
    }

    return this.examStudentsService.assignStudents(
      examId,
      studentIds,
      createdBy,
    );
  }
}
