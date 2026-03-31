import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterDto {
  @IsString()
  userid: string;

  @IsString()
  password: string;

  @IsString()
  name: string;

  @IsString()
  role: string; // e.g., 'student', 'teacher', 'admin'

  @IsOptional()
  @IsUUID()
  created_by?: string;
}
