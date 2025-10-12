import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsIn, IsArray, IsInt, ValidateNested } from 'class-validator';

class OptionDto {
  @IsString()
  type: "text" | "image";

  @IsString()
  value: string;
}

export class CreateQuestionnaireDto {
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsIn(['multiple_choice', 'essay'])
  type: 'multiple_choice' | 'essay';

  // Kalau multiple_choice → isi array string
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];

  // Jawaban benar / referensi
  @IsOptional()
  @IsString()
  answer?: string;

  @Type(() => Number)
  @IsInt()
  index: number;

  @IsOptional()
  @IsString()
  created_by?: string;
}
