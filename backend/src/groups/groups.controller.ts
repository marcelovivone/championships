import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, GroupResponseDto } from '../common/dtos';

/**
 * Controller for managing group-related data.
 * Provides endpoints for CRUD operations on groups within phases/rounds.
 */
@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * GET /groups
   * Retrieve all groups, optionally filtered by phase/round
   */
  @ApiOperation({ summary: 'Retrieve all groups' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  @Get()
  async findAll(
    @Query('phaseId') phaseId?: string,
  ): Promise<GroupResponseDto[]> {
    if (phaseId) {
      return this.groupsService.findByPhase(parseInt(phaseId, 10));
    }
    return this.groupsService.findAll();
  }

  /**
   * GET /groups/:id
   * Retrieve group by ID
   */
  @ApiOperation({ summary: 'Retrieve a group by ID' })
  @ApiResponse({ status: 200, description: 'The group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<GroupResponseDto> {
    return this.groupsService.findOne(id);
  }

  /**
   * POST /groups
   * Create a new group
   */
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'The group has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createGroupDto: CreateGroupDto): Promise<GroupResponseDto> {
    return this.groupsService.create(createGroupDto);
  }

  /**
   * PUT /groups/:id
   * Update an existing group
   */
  @ApiOperation({ summary: 'Update a group' })
  @ApiResponse({ status: 200, description: 'The group has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(id, updateGroupDto);
  }

  /**
   * DELETE /groups/:id
   * Delete a group
   */
  @ApiOperation({ summary: 'Delete a group' })
  @ApiResponse({ status: 204, description: 'The group has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.groupsService.remove(id);
  }
}