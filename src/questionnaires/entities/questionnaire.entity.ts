import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exam } from '../../exams/entities/exam.entity';
import { User } from '../../users/entities/user.entity';

@Entity('questionnaires')
export class Questionnaire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, (exam) => exam.questionnaires, { onDelete: 'CASCADE' })
  exam: Exam;

  @Column('text')
  question: string;

  @Column({
    type: 'enum',
    enum: ['multiple_choice', 'essay'],
  })
  type: 'multiple_choice' | 'essay';

  @Column({ type: "jsonb", nullable: true })
  options: { type: "text" | "image"; value: string }[];

  @Column('text', { nullable: true })
  answer?: string;

  @Column()
  index: number;

  /** AUDIT TRAIL FIELDS **/

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
