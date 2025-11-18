import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamService } from './exam.service';
import { ExamStudentsService } from './exam-student.service';
import { ExamSubmissionService } from './exam-submission.service';
import { ExamSessionService } from './exam-session.service';
import { TeacherExamsService } from './teacher-exam.service';
import { ExamController } from './exam.controller';
import { ExamSubmissionController } from './exam-submission.controller';
import { ExamSessionController } from './exam-session.controller';
import { TeacherExamsController } from './teacher-exam.controller';
import { Exam } from './entities/exam.entity';
import { ExamStudent } from './entities/exam-student.entity';
import { ExamSubmission } from './entities/exam-submission.entity';
import { ExamSession } from './entities/exam-session.entity';
import { Questionnaire } from '../questionnaires/entities/questionnaire.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamStudent, ExamSubmission, ExamSession, Questionnaire])],
  providers: [ExamService, ExamStudentsService, ExamSubmissionService, ExamSessionService, TeacherExamsService],
  exports: [ExamService, ExamStudentsService, ExamSubmissionService, ExamSessionService, TeacherExamsService],
  controllers: [ExamController, ExamSubmissionController, ExamSessionController, TeacherExamsController],
})
export class ExamModule {}
