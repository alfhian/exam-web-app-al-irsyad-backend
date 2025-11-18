import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamSession } from './entities/exam-session.entity';
import { ExamSubmission } from './entities/exam-submission.entity';
import { ExamSessionService } from './exam-session.service';
import { ExamSessionController } from './exam-session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExamSession, ExamSubmission])],
  providers: [ExamSessionService],
  controllers: [ExamSessionController],
  exports: [ExamSessionService],
})
export class ExamSessionModule {}
