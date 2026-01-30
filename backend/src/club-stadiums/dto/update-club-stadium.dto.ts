import { PartialType } from '@nestjs/mapped-types';
import { CreateClubStadiumDto } from './create-club-stadium.dto';

export class UpdateClubStadiumDto extends PartialType(CreateClubStadiumDto) {}
