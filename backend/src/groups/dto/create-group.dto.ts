import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  sportId: number;

  @IsInt()
  @IsNotEmpty()
  leagueId: number;

  @IsInt()
  @IsNotEmpty()
  seasonId: number;
}
