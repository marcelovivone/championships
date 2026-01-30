import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateStadiumDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  cityId: number;

  @IsInt()
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsNotEmpty()
  type: string; // 'stadium' or 'gymnasium'

  @IsInt()
  @IsOptional()
  yearConstructed?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}