import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn
} from 'typeorm';
import { Subject } from '../../subjects/entities/subject.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity()
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column()
  duration: number; // in minutes

  @Column({ type: 'text', nullable: true })
  notes?: string;

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

  @Column({ type: 'uuid' })
  subject_id: string;

  @ManyToOne(() => Subject, subject => subject.exams)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @OneToMany(() => Question, (question: Question) => question.exam)
  questions: Question[];
}
