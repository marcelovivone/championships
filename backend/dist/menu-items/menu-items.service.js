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
exports.MenuItemsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
let MenuItemsService = class MenuItemsService {
    constructor(db) {
        this.db = db;
    }
    async create(createMenuItemDto) {
        const [menuItem] = await this.db
            .insert(schema.menuItems)
            .values(createMenuItemDto)
            .returning();
        return menuItem;
    }
    async findAll() {
        return await this.db.select().from(schema.menuItems);
    }
    async findByCategory(category) {
        return await this.db
            .select()
            .from(schema.menuItems)
            .where((0, drizzle_orm_1.eq)(schema.menuItems.category, category));
    }
    async findOne(id) {
        const [menuItem] = await this.db
            .select()
            .from(schema.menuItems)
            .where((0, drizzle_orm_1.eq)(schema.menuItems.id, id));
        if (!menuItem) {
            throw new common_1.NotFoundException(`Menu item with ID ${id} not found`);
        }
        return menuItem;
    }
    async update(id, updateMenuItemDto) {
        const [menuItem] = await this.db
            .update(schema.menuItems)
            .set(updateMenuItemDto)
            .where((0, drizzle_orm_1.eq)(schema.menuItems.id, id))
            .returning();
        if (!menuItem) {
            throw new common_1.NotFoundException(`Menu item with ID ${id} not found`);
        }
        return menuItem;
    }
    async remove(id) {
        const [menuItem] = await this.db
            .delete(schema.menuItems)
            .where((0, drizzle_orm_1.eq)(schema.menuItems.id, id))
            .returning();
        if (!menuItem) {
            throw new common_1.NotFoundException(`Menu item with ID ${id} not found`);
        }
        return menuItem;
    }
};
exports.MenuItemsService = MenuItemsService;
exports.MenuItemsService = MenuItemsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], MenuItemsService);
//# sourceMappingURL=menu-items.service.js.map