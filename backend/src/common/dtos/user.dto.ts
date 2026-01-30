/**
 * User DTOs
 */

import { IsString, IsEmail, IsEnum, IsOptional, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export enum UserProfile {
  ADMIN = 'admin',
  FINAL_USER = 'final_user',
}

export class CreateUserDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ enum: UserProfile, default: UserProfile.FINAL_USER })
  @IsOptional()
  @IsEnum(UserProfile)
  profile?: UserProfile;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ enum: UserProfile, example: UserProfile.ADMIN })
  profile: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ 
    example: ['main_screen', 'leagues', 'standings'],
    description: 'List of menu items the user can access',
    required: false
  })
  allowedMenuItems?: string[];
}