import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreateProfilePermissionDto, CreateUserPermissionDto } from './dto/create-permission.dto';
import { UpdateProfilePermissionDto, UpdateUserPermissionDto } from './dto/update-permission.dto';
import { ProfilePermissionResponseDto, UserPermissionResponseDto, UserPermissionsDto } from './dto/permission-response.dto';

@ApiTags('Permissions')
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ==================== Profile Permissions ====================

  @Post('profile')
  @ApiOperation({ summary: 'Create a profile permission' })
  @ApiResponse({ status: 201, description: 'Profile permission created', type: ProfilePermissionResponseDto })
  createProfilePermission(@Body() dto: CreateProfilePermissionDto) {
    return this.permissionsService.createProfilePermission(dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get all profile permissions' })
  @ApiQuery({ name: 'profile', required: false, description: 'Filter by profile (e.g., final_user)' })
  @ApiResponse({ status: 200, description: 'List of profile permissions', type: [ProfilePermissionResponseDto] })
  findAllProfilePermissions(@Query('profile') profile?: string) {
    return this.permissionsService.findAllProfilePermissions(profile);
  }

  @Get('profile/:id')
  @ApiOperation({ summary: 'Get a profile permission by ID' })
  @ApiResponse({ status: 200, description: 'Profile permission found', type: ProfilePermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Profile permission not found' })
  findProfilePermission(@Param('id') id: string) {
    return this.permissionsService.findProfilePermission(+id);
  }

  @Patch('profile/:id')
  @ApiOperation({ summary: 'Update a profile permission' })
  @ApiResponse({ status: 200, description: 'Profile permission updated', type: ProfilePermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Profile permission not found' })
  updateProfilePermission(@Param('id') id: string, @Body() dto: UpdateProfilePermissionDto) {
    return this.permissionsService.updateProfilePermission(+id, dto);
  }

  @Delete('profile/:id')
  @ApiOperation({ summary: 'Delete a profile permission' })
  @ApiResponse({ status: 200, description: 'Profile permission deleted', type: ProfilePermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Profile permission not found' })
  removeProfilePermission(@Param('id') id: string) {
    return this.permissionsService.removeProfilePermission(+id);
  }

  // ==================== User Permissions ====================

  @Post('user')
  @ApiOperation({ summary: 'Create a user permission' })
  @ApiResponse({ status: 201, description: 'User permission created', type: UserPermissionResponseDto })
  createUserPermission(@Body() dto: CreateUserPermissionDto) {
    return this.permissionsService.createUserPermission(dto);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get all user permissions' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'List of user permissions', type: [UserPermissionResponseDto] })
  findAllUserPermissions(@Query('userId') userId?: string) {
    return this.permissionsService.findAllUserPermissions(userId ? +userId : undefined);
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get a user permission by ID' })
  @ApiResponse({ status: 200, description: 'User permission found', type: UserPermissionResponseDto })
  @ApiResponse({ status: 404, description: 'User permission not found' })
  findUserPermission(@Param('id') id: string) {
    return this.permissionsService.findUserPermission(+id);
  }

  @Patch('user/:id')
  @ApiOperation({ summary: 'Update a user permission' })
  @ApiResponse({ status: 200, description: 'User permission updated', type: UserPermissionResponseDto })
  @ApiResponse({ status: 404, description: 'User permission not found' })
  updateUserPermission(@Param('id') id: string, @Body() dto: UpdateUserPermissionDto) {
    return this.permissionsService.updateUserPermission(+id, dto);
  }

  @Delete('user/:id')
  @ApiOperation({ summary: 'Delete a user permission' })
  @ApiResponse({ status: 200, description: 'User permission deleted', type: UserPermissionResponseDto })
  @ApiResponse({ status: 404, description: 'User permission not found' })
  removeUserPermission(@Param('id') id: string) {
    return this.permissionsService.removeUserPermission(+id);
  }

  // ==================== Permission Resolution ====================

  @Get('user/:userId/allowed-menu-items')
  @ApiOperation({ summary: 'Get all menu items a user can access' })
  @ApiResponse({ status: 200, description: 'List of allowed menu items', type: UserPermissionsDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserAllowedMenuItems(@Param('userId') userId: string) {
    const allowedMenuItems = await this.permissionsService.getUserAllowedMenuItems(+userId);
    return {
      userId: +userId,
      allowedMenuItems,
    };
  }
}
