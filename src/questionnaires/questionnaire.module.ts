import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { Questionnaire } from './entities/questionnaire.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Questionnaire])],
  providers: [QuestionnaireService],
  exports: [QuestionnaireService],
  controllers: [QuestionnaireController]
})
export class QuestionnaireModule {}
