import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn
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

  @ManyToOne(() => Subject, subject => subject.exams)
  subject: Subject;

  @OneToMany(() => Question, (question: Question) => question.exam)
  questions: Question[];
}
