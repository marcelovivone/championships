"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const COUNTRY_TIMEZONES = {
    'England': 'Europe/London',
    'United Kingdom': 'Europe/London',
    'UK': 'Europe/London',
    'Spain': 'Europe/Madrid',
    'France': 'Europe/Paris',
    'Germany': 'Europe/Berlin',
    'Italy': 'Europe/Rome',
    'Netherlands': 'Europe/Amsterdam',
    'Portugal': 'Europe/Lisbon',
    'Belgium': 'Europe/Brussels',
    'Switzerland': 'Europe/Zurich',
    'Austria': 'Europe/Vienna',
    'Poland': 'Europe/Warsaw',
    'Czech Republic': 'Europe/Prague',
    'Russia': 'Europe/Moscow',
    'Turkey': 'Europe/Istanbul',
    'Greece': 'Europe/Athens',
    'Sweden': 'Europe/Stockholm',
    'Norway': 'Europe/Oslo',
    'Denmark': 'Europe/Copenhagen',
    'Finland': 'Europe/Helsinki',
    'Ukraine': 'Europe/Kiev',
    'Croatia': 'Europe/Zagreb',
    'Serbia': 'Europe/Belgrade',
    'Romania': 'Europe/Bucharest',
    'Bulgaria': 'Europe/Sofia',
    'Brazil': 'America/Brasilia',
    'Argentina': 'America/Argentina/Buenos_Aires',
    'Chile': 'America/Santiago',
    'Colombia': 'America/Bogota',
    'Mexico': 'America/Mexico_City',
    'United States': 'America/New_York',
    'USA': 'America/New_York',
    'Canada': 'America/Toronto',
    'Peru': 'America/Lima',
    'Ecuador': 'America/Guayaquil',
    'Uruguay': 'America/Montevideo',
    'Paraguay': 'America/Asuncion',
    'Bolivia': 'America/La_Paz',
    'Venezuela': 'America/Caracas',
    'Japan': 'Asia/Tokyo',
    'China': 'Asia/Shanghai',
    'South Korea': 'Asia/Seoul',
    'India': 'Asia/Kolkata',
    'Australia': 'Australia/Sydney',
    'Saudi Arabia': 'Asia/Riyadh',
    'UAE': 'Asia/Dubai',
    'Qatar': 'Asia/Qatar',
    'Iran': 'Asia/Tehran',
    'Israel': 'Asia/Jerusalem',
    'South Africa': 'Africa/Johannesburg',
    'Egypt': 'Africa/Cairo',
    'Morocco': 'Africa/Casablanca',
    'Nigeria': 'Africa/Lagos',
    'Algeria': 'Africa/Algiers',
    'Tunisia': 'Africa/Tunis',
};
let AdminService = AdminService_1 = class AdminService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    convertToLocalTimezone(utcDate, timezone) {
        if (!timezone) {
            return utcDate;
        }
        this.logger.warn(`Converting date ${utcDate.toISOString()} using timezone: ${timezone}`);
        console.log(`Converting date ${utcDate.toISOString()} using timezone: ${timezone}`);
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            this.logger.warn(`Formatter created for timezone: ${timezone}`);
            console.log(`Formatter created for timezone: ${timezone}`);
            const parts = formatter.formatToParts(utcDate);
            const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');
            const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
            const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
            const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
            const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
            const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
            this.logger.warn(`Parsed date parts - Year: ${year}, Month: ${month + 1}, Day: ${day}, Hour: ${hour}, Minute: ${minute}, Second: ${second}`);
            console.log(`Parsed date parts - Year: ${year}, Month: ${month + 1}, Day: ${day}, Hour: ${hour}, Minute: ${minute}, Second: ${second}`);
            return new Date(year, month, day, hour, minute, second);
        }
        catch (error) {
            this.logger.warn(`Failed to convert timezone for ${timezone}, using original date: ${error.message}`);
            console.log(`Failed to convert timezone for ${timezone}, using original date: ${error.message}`);
            return utcDate;
        }
    }
    applyManualAdjustment(date, hours) {
        const adjustedDate = new Date(date);
        adjustedDate.setHours(adjustedDate.getHours() + hours);
        return adjustedDate;
    }
    buildMatchQuery(filters) {
        let whereCondition = (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, filters.leagueId);
        if (filters.seasonId) {
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, filters.seasonId));
        }
        if (filters.roundIds && filters.roundIds.length > 0) {
            let roundCond = (0, drizzle_orm_1.eq)(schema_1.matches.roundId, filters.roundIds[0]);
            for (let i = 1; i < filters.roundIds.length; i++) {
                roundCond = (0, drizzle_orm_1.or)(roundCond, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, filters.roundIds[i]));
            }
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, roundCond);
        }
        else if (filters.roundId) {
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, filters.roundId));
        }
        if (filters.matchId) {
            whereCondition = (0, drizzle_orm_1.and)(whereCondition, (0, drizzle_orm_1.eq)(schema_1.matches.id, filters.matchId));
        }
        return whereCondition;
    }
    async performTimezoneAdjustment(dto) {
        const startTime = Date.now();
        try {
            const whereCondition = this.buildMatchQuery({
                leagueId: dto.leagueId,
                seasonId: dto.seasonId,
                roundId: dto.roundId,
                roundIds: dto.roundIds,
                matchId: dto.matchId
            });
            const matchesToUpdate = await this.db
                .select()
                .from(schema_1.matches)
                .where(whereCondition);
            if (matchesToUpdate.length === 0) {
                return {
                    success: true,
                    matchesUpdated: 0,
                    standingsRecalculated: 0,
                    message: 'No matches found to update'
                };
            }
            let updatedCount = 0;
            const updateIds = [];
            for (const match of matchesToUpdate) {
                let newDate;
                if (dto.adjustmentType === 'country' && dto.countryTimezone) {
                    newDate = this.convertToLocalTimezone(new Date(match.date), dto.countryTimezone);
                }
                else if (dto.adjustmentType === 'manual' && dto.manualHours !== undefined) {
                    newDate = this.applyManualAdjustment(new Date(match.date), dto.manualHours);
                }
                else if (dto.adjustmentType === 'set' && dto.setTime) {
                    const timeStr = String(dto.setTime).trim();
                    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
                    if (!m) {
                        continue;
                    }
                    const hours = parseInt(m[1], 10);
                    const minutes = parseInt(m[2], 10);
                    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                        continue;
                    }
                    if (dto.setDate) {
                        const dateStr = String(dto.setDate).trim();
                        const dm = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                        if (!dm) {
                            continue;
                        }
                        const y = parseInt(dm[1], 10);
                        const mo = parseInt(dm[2], 10) - 1;
                        const dday = parseInt(dm[3], 10);
                        newDate = new Date(Date.UTC(y, mo, dday, hours, minutes, 0, 0));
                    }
                    else {
                        newDate = new Date(match.date);
                        newDate.setUTCHours(hours, minutes, 0, 0);
                    }
                }
                else {
                    continue;
                }
                await this.db
                    .update(schema_1.matches)
                    .set({
                    date: newDate,
                    updatedAt: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.matches.id, match.id));
                updatedCount++;
                updateIds.push(match.id);
            }
            const standingsRecalculated = 0;
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                matchesUpdated: updatedCount,
                standingsRecalculated,
                details: {
                    adjustmentType: dto.adjustmentType,
                    timezone: dto.countryTimezone,
                    manualHours: dto.manualHours,
                    setTime: dto.setTime,
                    setDate: dto.setDate || null,
                    executionTimeMs: executionTime,
                    updatedMatchIds: updateIds
                }
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`Timezone adjustment failed after ${executionTime}ms: ${error.message}`, error.stack);
            throw new Error(`Database operation failed: ${error.message}`);
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], AdminService);
//# sourceMappingURL=admin.service.js.map