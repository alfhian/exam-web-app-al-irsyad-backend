import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
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

  // JSON berisi array jawaban: [{ question_id: '...', answer: '...', is_correct: boolean }]
  @Column({ type: 'jsonb' })
  answers: { question_id: string; answer: string; is_correct?: boolean }[];

  @Column({ type: 'float', nullable: true })
  score: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn({ nullable: true })
  updated_at?: Date;

  // 🧩 User yang membuat submission
  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  // 🧩 User terakhir yang mengupdate submission
  @Column({ type: 'uuid', nullable: true })
  updated_by?: string;

  // 🧩 Informasi file rekaman
  @Column({ nullable: true })
  file_name?: string;

  @Column({ nullable: true })
  file_path?: string;

  // Relasi ke exam
  @ManyToOne(() => Exam)
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  // Relasi ke student (user dengan role SISWA)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;
}
