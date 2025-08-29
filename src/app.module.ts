import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExamModule } from './exams/exam.module';
import { SupabaseModule } from './supabase/supabase.module';
import { Subject } from './subjects/entities/subject.entity';
import { Exam } from './exams/entities/exam.entity';
import { Question } from './questions/entities/question.entity';
import { Choice } from './choices/entities/choice.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    ExamModule,
    SupabaseModule,
    Subject,
    Exam,
    Question,
    Choice,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


