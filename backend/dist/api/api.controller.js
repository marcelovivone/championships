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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiController = void 0;
const common_1 = require("@nestjs/common");
const api_service_1 = require("./api.service");
let ApiController = class ApiController {
    constructor(apiService) {
        this.apiService = apiService;
    }
    status() {
        return { ok: true };
    }
    async import(payload) {
        const created = await this.apiService.importData(payload);
        return { created: Array.isArray(created) ? created.length : 0, items: created };
    }
    async fetchAndStore(body) {
        const result = await this.apiService.fetchAndStore(body.league, body.season, body.sport, body.origin, body.startDate, body.endDate, body.seasonStatus, body.isSeasonDefault, body.sameYears, body.scheduleType, body.isLeagueDefault, body.hasDivisions, body.hasGroups, body.numberOfGroups, body.runInBackground, body.inferClubs);
        return { stored: result };
    }
    async listTransitional(limit) {
        const l = limit ? Number(limit) : 100;
        const rows = await this.apiService.listTransitional(l);
        const items = rows.map(({ payload, ...rest }) => rest);
        return { count: rows.length, items };
    }
    async getTransitional(id) {
        const row = await this.apiService.getTransitional(id);
        if (!row)
            return { found: false };
        const { payload, ...rest } = row;
        return { found: true, item: rest };
    }
    async parseTransitional(id, roundOverridesJson, seasonPhase) {
        let roundOverrides;
        if (roundOverridesJson) {
            try {
                roundOverrides = JSON.parse(roundOverridesJson);
            }
            catch { }
        }
        const parsed = await this.apiService.parseTransitional(id, roundOverrides, seasonPhase);
        if (!parsed || !parsed.found) {
            const reason = parsed?.reason ?? 'parse_failed';
            const error = parsed?.error ?? parsed?.details?.message ?? null;
            const details = parsed?.details ?? null;
            return { found: false, reason, error, details };
        }
        return { found: true, columns: parsed.columns, rows: parsed.rows, isSubsequentLoad: !!parsed.isSubsequentLoad };
    }
    async structuredTransitional(id) {
        const res = await this.apiService.extractStructuredFromTransitional(id);
        if (!res || !res.found)
            return { found: false };
        return { found: true, firstRow: res.firstRow, matches: res.matches };
    }
    async getRoundReview(id) {
        const review = await this.apiService.getRoundReview(id);
        return { found: !!review, item: review };
    }
    async patchRoundReview(id, body) {
        const review = await this.apiService.saveRoundReview(id, body?.overrides ?? {});
        return { success: true, item: review };
    }
    async deleteRoundReview(id) {
        const result = await this.apiService.deleteRoundReview(id);
        return { success: !!result?.deleted };
    }
    async getEntityReview(id) {
        const review = await this.apiService.getEntityReview(id);
        return { found: !!review, item: review };
    }
    async patchEntityReview(id, body) {
        const review = await this.apiService.saveEntityReview(id, body?.leagueMapping ?? null, body?.clubMappings ?? {}, body?.stadiumMappings ?? {}, body?.countryMapping ?? null);
        return { success: true, item: review };
    }
    async deleteEntityReview(id) {
        const result = await this.apiService.deleteEntityReview(id);
        return { success: !!result?.deleted };
    }
    async getEntitySuggestions(id, sportId, seasonPhase) {
        const result = await this.apiService.detectEntitiesForReview(id, sportId ? parseInt(sportId) : undefined, seasonPhase);
        return result;
    }
    async applyFirstRow(id, body) {
        const result = await this.apiService.applyFirstRowToApp(id, { sportId: body?.sportId, seasonPhase: body?.seasonPhase });
        return result;
    }
    async applyAllRows(id, body) {
        const opts = { sportId: body?.sportId, dryRun: !!body?.dryRun, roundOverrides: body?.roundOverrides, seasonPhase: body?.seasonPhase };
        if (opts.dryRun) {
            return await this.apiService.applyAllRowsToApp(id, opts);
        }
        await this.apiService.startApplyJob(id);
        setImmediate(() => {
            this.apiService
                .applyAllRowsToApp(id, opts)
                .then((result) => this.apiService.finishApplyJob(id, result))
                .catch((err) => this.apiService.failApplyJob(id, String(err)));
        });
        return { background: true, status: 'running' };
    }
    async getApplyStatus(id) {
        return this.apiService.getApplyStatus(id);
    }
    async repairDivisions(id, body) {
        return this.apiService.repairDivisionsFromPayload(id, body?.sportId);
    }
    async loadTransitional(id, body) {
        const result = await this.apiService.applyTransitional(id, {
            dryRun: !!body?.dryRun,
            targetTable: body?.targetTable,
            mapping: body?.mapping,
        });
        return { result };
    }
    async deleteTransitional(id) {
        const res = await this.apiService.deleteTransitional(id);
        if (!res || !res.deleted)
            throw new common_1.NotFoundException('Transitional row not found');
        return { success: true, id: res.id };
    }
    async patchTransitional(id, body) {
        const res = await this.apiService.updateTransitional(id, body);
        if (!res || !res.updated)
            throw new common_1.NotFoundException('Transitional row not found');
        return { success: true, id: res.id, status: res.status };
    }
    async getTargetColumns(table) {
        if (!table)
            return { columns: [] };
        const cols = await this.apiService.getTableColumns(table);
        return { columns: cols };
    }
};
exports.ApiController = ApiController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ApiController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('import'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "import", null);
__decorate([
    (0, common_1.Post)('fetch-and-store'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "fetchAndStore", null);
__decorate([
    (0, common_1.Get)('transitional'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "listTransitional", null);
__decorate([
    (0, common_1.Get)('transitional/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getTransitional", null);
__decorate([
    (0, common_1.Get)('transitional/:id/parse'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('roundOverrides')),
    __param(2, (0, common_1.Query)('seasonPhase')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "parseTransitional", null);
__decorate([
    (0, common_1.Get)('transitional/:id/structured'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "structuredTransitional", null);
__decorate([
    (0, common_1.Get)('transitional/:id/round-review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getRoundReview", null);
__decorate([
    (0, common_1.Patch)('transitional/:id/round-review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "patchRoundReview", null);
__decorate([
    (0, common_1.Delete)('transitional/:id/round-review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "deleteRoundReview", null);
__decorate([
    (0, common_1.Get)('transitional/:id/entity-review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getEntityReview", null);
__decorate([
    (0, common_1.Patch)('transitional/:id/entity-review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "patchEntityReview", null);
__decorate([
    (0, common_1.Delete)('transitional/:id/entity-review'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "deleteEntityReview", null);
__decorate([
    (0, common_1.Get)('transitional/:id/entity-suggestions'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('sportId')),
    __param(2, (0, common_1.Query)('seasonPhase')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getEntitySuggestions", null);
__decorate([
    (0, common_1.Post)('transitional/:id/apply-first-row'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "applyFirstRow", null);
__decorate([
    (0, common_1.Post)('transitional/:id/apply-all-rows'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "applyAllRows", null);
__decorate([
    (0, common_1.Get)('transitional/:id/apply-status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getApplyStatus", null);
__decorate([
    (0, common_1.Post)('transitional/:id/repair-divisions'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "repairDivisions", null);
__decorate([
    (0, common_1.Post)('transitional/:id/load'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "loadTransitional", null);
__decorate([
    (0, common_1.Delete)('transitional/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "deleteTransitional", null);
__decorate([
    (0, common_1.Patch)('transitional/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "patchTransitional", null);
__decorate([
    (0, common_1.Get)('target-columns'),
    __param(0, (0, common_1.Query)('table')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApiController.prototype, "getTargetColumns", null);
exports.ApiController = ApiController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [api_service_1.ApiService])
], ApiController);
//# sourceMappingURL=api.controller.js.map