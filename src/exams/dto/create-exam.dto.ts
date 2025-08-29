// create-exam.dto.ts
import { IsString, IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateExamDto {
  @IsString()
  title: string;

  @IsString()
  subjectId: string;

  @IsDateString()
  date: string;

  @IsInt()
  durationMinutes: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
