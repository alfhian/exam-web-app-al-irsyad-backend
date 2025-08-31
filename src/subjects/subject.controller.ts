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
  Req
} from '@nestjs/common';
import { Subject } from './entities/subject.entity';
import { SubjectService } from './subject.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
@UseGuards(AuthGuard('jwt'))
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  async create(@Body() body: Partial<Subject>, @Req() req: Request): Promise<Subject> {
    const createdBy = (req as any).user['sub'];

    if (!body.name) {
      throw new BadRequestException('Missing required fields: name');
    }

    if (!body.class_id) {
      throw new BadRequestException('Missing required fields: class_id');
    }

    return this.subjectService.create({
      name: body.name,
      class_id: body.class_id,
      description: body.description,
      created_by: createdBy,
    });
  }

  @Get()
  async getAll(
    @Query('search') search: string = '',
    @Query('sort') sort = 'name',
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('page') page = '1',
    @Query('limit') limit = '10'
  ) {
    try {
      return await this.subjectService.getDataWithPagination(search, sort, order, Number(page), Number(limit));
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjectService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.update(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @Body('deletedBy') deletedBy: string) {
    return this.subjectService.softDelete(id, deletedBy);
  }
}
