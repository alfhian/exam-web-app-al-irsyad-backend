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
import { Exam } from './entities/exam.entity';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('exams')
@UseGuards(AuthGuard('jwt'))
export class ExamController {
  constructor(private readonly examService: ExamService) {}

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

    let formattedDate: string = '';
    if (typeof body.date === 'string') {
      formattedDate = body.date;
    } else if (body.date instanceof Date) {
      formattedDate = body.date.toISOString();
    }

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examService.findById(id);
  }

  @Get(':id/questions')
  async getExamQuestions(@Param('id') examId: string) {
    try {
      return await this.examService.getExamQuestions(examId);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examService.update(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @Body('deletedBy') deletedBy: string) {
    return this.examService.softDelete(id, deletedBy);
  }

  @Get(':id/students')
  async getStudents(@Param('id') examId: string) {
    try {
      return await this.examService.getExamStudents(examId);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post(':id/students')
  async assignStudents(
    @Param('id') examId: string,
    @Body('studentIds') studentIds: string[],
  ) {
    return this.examService.assignStudents(examId, studentIds);
  }

}
