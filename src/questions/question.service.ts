import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Question } from './entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>
  ) {}

  async create(dto: CreateQuestionDto): Promise<Question> {
    const question = this.questionRepository.create({
      ...dto,
      type: dto.type as Question['type'],
    });
    return this.questionRepository.save(question);
  }

  async findAll(examId?: string): Promise<Question[]> {
    const queryBuilder = this.questionRepository.createQueryBuilder('question')
      .where('question.deleted_at IS NULL');

    if (examId) {
      queryBuilder.andWhere('question.exam_id = :examId', { examId });
    }

    return queryBuilder.getMany();
  }

  async findById(id: string): Promise<Question | null> {
    return this.questionRepository.findOne({
      where: { id, deleted_at: IsNull() }
    });
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findById(id);
    if (!question) throw new NotFoundException(`Question ${id} not found`);

    Object.assign(question, {
      ...dto,
      type: dto.type as Question['type'],
    });

    return this.questionRepository.save(question);
  }

  async softDelete(id: string, deletedBy: string): Promise<Question> {
    const question = await this.findById(id);
    if (!question) throw new NotFoundException(`Question ${id} not found`);

    question.deleted_at = new Date();
    question.deleted_by = deletedBy;

    return this.questionRepository.save(question);
  }
}
