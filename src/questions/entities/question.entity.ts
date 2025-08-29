import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exam } from '../../exams/entities/exam.entity';
import { Choice } from '../../choices/entities/choice.entity';

export type QuestionType = 'multiple_choice' | 'essay';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  questionText: string;

  @Column({ type: 'enum', enum: ['multiple_choice', 'essay'] })
  type: QuestionType;

  @Column('int')
  points: number;

  @ManyToOne(() => Exam, (exam) => exam.questions)
  exam: Exam;

  @OneToMany(() => Choice, (choice: Choice) => choice.question, { cascade: true })
  choices: Choice[];

  @CreateDateColumn()
  created_at: Date;

  @Column({ length: 100 })
  created_by: string;

  @UpdateDateColumn({ nullable: true })
  updated_at?: Date;

  @Column({ length: 100, nullable: true })
  updated_by?: string;

  @DeleteDateColumn({ nullable: true })
  deleted_at?: Date;

  @Column({ length: 100, nullable: true })
  deleted_by?: string;
}
