import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Questionnaire } from './entities/questionnaire.entity';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';

@Injectable()
export class QuestionnaireService {
  constructor(
    @InjectRepository(Questionnaire)
    private readonly questionnaireRepository: Repository<Questionnaire>
  ) {}

  async create(dto: CreateQuestionnaireDto): Promise<Questionnaire> {
    const questionnaire = this.questionnaireRepository.create({
      ...dto,
      created_at: new Date(),
      created_by: dto.created_by,
    });
    return this.questionnaireRepository.save(questionnaire);
  }

  async getDataWithPagination(
    examId: string,
    search: string,
    sort: string,
    order: 'asc' | 'desc',
    page: number,
    limit: number,
  ): Promise<{ data: Questionnaire[]; meta: any }> {
    const offset = (page - 1) * limit;
    const keyword = search?.trim().toLowerCase();

    const queryBuilder = this.questionnaireRepository.createQueryBuilder('questionnaire')
      .where('questionnaire.exam_id = :examId', { examId })
      .andWhere('questionnaire.deleted_at IS NULL');

    if (keyword) {
      queryBuilder.andWhere(
        '(LOWER(questionnaire.question) LIKE :keyword OR LOWER(questionnaire.type) LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder
      .orderBy(`questionnaire.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Questionnaire> {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id, deleted_at: IsNull() }
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire ${id} not found`);
    }

    return questionnaire;
  }

  async update(
    id: string,
    dto: UpdateQuestionnaireDto & { updated_by?: string },
  ): Promise<Questionnaire> {
    const questionnaire = await this.findById(id);

    Object.assign(questionnaire, {
      ...dto,
      updated_at: new Date(),
      updated_by: dto.updated_by,
    });

    return this.questionnaireRepository.save(questionnaire);
  }

  async softDelete(id: string, deletedBy: string): Promise<Questionnaire> {
    const questionnaire = await this.findById(id);

    questionnaire.deleted_at = new Date();
    questionnaire.deleted_by = deletedBy;

    return this.questionnaireRepository.save(questionnaire);
  }
}
