import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exam } from '../../exams/entities/exam.entity';

@Entity('subjects') // Optional: untuk kontrol nama tabel
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description?: string;

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

  @OneToMany(() => Exam, (exam: Exam) => exam.subject)
  exams: Exam[];
}
