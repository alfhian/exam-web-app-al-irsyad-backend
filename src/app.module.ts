import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExamModule } from './exams/exam.module';
import { SubjectModule } from './subjects/subject.module';
import { SupabaseModule } from './supabase/supabase.module';
import { QuestionnaireModule } from './questionnaires/questionnaire.module'
import { Subject } from './subjects/entities/subject.entity';
import { Exam } from './exams/entities/exam.entity';
import { Choice } from './choices/entities/choice.entity';
import { Questionnaire } from './questionnaires/entities/questionnaire.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    ExamModule,
    QuestionnaireModule,
    SubjectModule,
    SupabaseModule,
    Subject,
    Exam,
    Questionnaire,
    Choice,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


