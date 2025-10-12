import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  BadRequestException,
  Query,
  InternalServerErrorException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionnaireService } from './questionnaire.service';
import { Questionnaire } from './entities/questionnaire.entity';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';

@Controller('exams/:examId/questionnaires')
@UseGuards(AuthGuard('jwt'))
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post()
  async create(
    @Param('examId') examId: string,
    @Body() dto: CreateQuestionnaireDto,
    @Req() req: any,
  ): Promise<Questionnaire> {
    const createdBy = req.user?.sub;
    if (!dto.question || !dto.type) {
      throw new BadRequestException(
        'Missing required fields: question, type',
      );
    }

    return this.questionnaireService.create({
      ...dto,
      exam_id: examId,
      created_by: createdBy,
    });
  }

  @Get()
  async getAll(
    @Param('examId') examId: string,
    @Query('search') search = '',
    @Query('sort') sort = 'created_at',
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    try {
      return await this.questionnaireService.getDataWithPagination(
        examId,
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
  async findOne(@Param('id') id: string) {
    return this.questionnaireService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionnaireDto,
    @Req() req: any,
  ) {
    const updatedBy = req.user?.sub;
    return this.questionnaireService.update(id, {
      ...dto,
      updated_by: updatedBy,
    });
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string, @Req() req: any) {
    const deletedBy = req.user?.sub;
    return this.questionnaireService.softDelete(id, deletedBy);
  }
}
