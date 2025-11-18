import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamSubmission } from './entities/exam-submission.entity';
import { Questionnaire } from '../questionnaires/entities/questionnaire.entity';
import { ExamSubmissionService } from './exam-submission.service';
import { ExamSessionController } from './exam-session.controller';
import { ExamSubmissionController } from './exam-submission.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExamSubmission, Questionnaire])],
  providers: [ExamSubmissionService],
  controllers: [ExamSubmissionController],
})
export class ExamSubmissionModule {}
