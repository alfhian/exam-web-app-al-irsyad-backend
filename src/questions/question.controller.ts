import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questionService.create(dto);
  }

  @Get()
  findAll(@Query('examId') examId?: string) {
    return this.questionService.findAll(examId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.update(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @Body('deletedBy') deletedBy: string) {
    return this.questionService.softDelete(id, deletedBy);
  }
}
