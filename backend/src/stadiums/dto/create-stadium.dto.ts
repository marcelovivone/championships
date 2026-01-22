import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateStadiumDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  cityId: number;

  @IsInt()
  @IsNotEmpty()
  capacity: number;
}