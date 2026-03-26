import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Req } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';

class TimezoneAdjustmentDto {
  leagueId: number;
  seasonId?: number;
  roundId?: number;
  matchId?: number;
  adjustmentType: 'country' | 'manual';
  manualHours?: number;
  countryTimezone?: string;
}

class TimezoneAdjustmentResponseDto {
  success: boolean;
  matchesUpdated: number;
  standingsRecalculated: number;
  details?: any;
  message?: string;
}

/**
 * Admin Controller
 * Handles administrative operations for the championships system  
 */
@ApiTags('Admin')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  constructor(private readonly adminService: AdminService) {}

  /**
   * POST /admin/timezone-adjustment
   * Updates match dates and standings to correct timezone information
   */
  @ApiOperation({ 
    summary: 'Update timezone information for matches and standings',
    description: 'Corrects timezone data for existing matches and recalculates standings based on updated match dates'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Timezone adjustment completed successfully', 
    type: TimezoneAdjustmentResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @Post('timezone-adjustment')
  @HttpCode(HttpStatus.OK)
  async timezoneAdjustment(@Req() req: Request, @Body() dto: TimezoneAdjustmentDto): Promise<TimezoneAdjustmentResponseDto> {
    // Visible logging to inspect incoming payload when troubleshooting
    this.logger.log(`Incoming timezoneAdjustment DTO: ${JSON.stringify(dto)}`);
    this.logger.log(`leagueId (raw): ${dto?.leagueId}, type: ${typeof dto?.leagueId}`);
    // Log request headers and raw body for deeper inspection
    try { this.logger.log(`Request headers: ${JSON.stringify(req.headers)}`); } catch (e) {}
    try { this.logger.log(`Request body (req.body): ${JSON.stringify((req as any).body)}`); } catch (e) {}
    // Additional console log to ensure it appears in all run modes
    console.log('Incoming timezoneAdjustment DTO (console):', dto);
    console.log('Request headers (console):', req.headers);
    console.log('Request body (console):', (req as any).body);

    // Some environments may not bind @Body correctly to the DTO class; fall back to raw body
    const bodyObj = dto && Object.keys(dto).length ? dto : (req as any).body;
    this.logger.log(`Using body object for processing: ${JSON.stringify(bodyObj)}`);

    // Use the chosen body object as the payload for validation and processing
    const payload = bodyObj as TimezoneAdjustmentDto;

    // Validation (use payload extracted from body)
    if (!payload || !payload.leagueId) {
      throw new BadRequestException('League ID is required');
    }

    if (!payload.adjustmentType || !['country', 'manual'].includes(payload.adjustmentType)) {
      throw new BadRequestException('Adjustment type must be either "country" or "manual"');
    }

    if (payload.adjustmentType === 'manual' && payload.manualHours === undefined) {
      throw new BadRequestException('Manual hours must be provided for manual adjustment type');
    }

    if (payload.adjustmentType === 'country' && !payload.countryTimezone) {
      throw new BadRequestException('Country timezone must be provided for country adjustment type');
    }

    try {
      const result = await this.adminService.performTimezoneAdjustment(payload as any);
      return result;
    } catch (error) {
      throw new BadRequestException(`Timezone adjustment failed: ${error.message}`);
    }
  }
}