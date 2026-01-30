import { IsString, IsNotEmpty, IsInt, IsOptional, ValidateIf } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  shortName?: string;

  @IsInt()
  @IsOptional()
  @ValidateIf((object: CreateClubDto) => object.foundationYear !== 0 && object.foundationYear !== null && object.foundationYear !== undefined)
  foundationYear?: number;

  @IsInt()
  @IsNotEmpty()
  countryId: number;

  @IsInt()
  @IsOptional()
  cityId: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}