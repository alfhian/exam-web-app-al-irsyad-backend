import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Exam } from './exam.entity';
import { User } from '../../users/entities/user.entity';

@Entity('exam_submissions')
export class ExamSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  exam_id: string;

  @Column({ type: 'uuid' })
  student_id: string;

  // JSON berisi array jawaban: [{ question_id: '...', answer: '...' }]
  @Column({ type: 'jsonb' })
  answers: { question_id: string; answer: string }[];

  @Column({ type: 'float', nullable: true })
  score: number;

  @CreateDateColumn()
  created_at: Date;

  // Relasi ke exam
  @ManyToOne(() => Exam)
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  // Relasi ke student (user dengan role SISWA)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;
}
