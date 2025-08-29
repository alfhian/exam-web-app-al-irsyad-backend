import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Controller('exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  create(@Body() dto: CreateExamDto) {
    return this.examService.create(dto);
  }

  @Get()
  findAll() {
    return this.examService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examService.update(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @Body('deletedBy') deletedBy: string) {
    return this.examService.softDelete(id, deletedBy);
  }
}
