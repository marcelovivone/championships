import { PartialType } from '@nestjs/swagger';
import { CreateProfilePermissionDto, CreateUserPermissionDto } from './create-permission.dto';

export class UpdateProfilePermissionDto extends PartialType(CreateProfilePermissionDto) {}

export class UpdateUserPermissionDto extends PartialType(CreateUserPermissionDto) {}
