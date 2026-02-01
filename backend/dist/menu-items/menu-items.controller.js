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
exports.MenuItemsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const menu_items_service_1 = require("./menu-items.service");
const create_menu_item_dto_1 = require("./dto/create-menu-item.dto");
const update_menu_item_dto_1 = require("./dto/update-menu-item.dto");
const menu_item_response_dto_1 = require("./dto/menu-item-response.dto");
let MenuItemsController = class MenuItemsController {
    constructor(menuItemsService) {
        this.menuItemsService = menuItemsService;
    }
    create(createMenuItemDto) {
        return this.menuItemsService.create(createMenuItemDto);
    }
    findAll(category) {
        if (category) {
            return this.menuItemsService.findByCategory(category);
        }
        return this.menuItemsService.findAll();
    }
    findOne(id) {
        return this.menuItemsService.findOne(+id);
    }
    update(id, updateMenuItemDto) {
        return this.menuItemsService.update(+id, updateMenuItemDto);
    }
    remove(id) {
        return this.menuItemsService.remove(+id);
    }
};
exports.MenuItemsController = MenuItemsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new menu item' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Menu item created successfully', type: menu_item_response_dto_1.MenuItemResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_menu_item_dto_1.CreateMenuItemDto]),
    __metadata("design:returntype", void 0)
], MenuItemsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all menu items' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of all menu items', type: [menu_item_response_dto_1.MenuItemResponseDto] }),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MenuItemsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a menu item by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Menu item found', type: menu_item_response_dto_1.MenuItemResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Menu item not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MenuItemsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a menu item' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Menu item updated successfully', type: menu_item_response_dto_1.MenuItemResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Menu item not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_menu_item_dto_1.UpdateMenuItemDto]),
    __metadata("design:returntype", void 0)
], MenuItemsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a menu item' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Menu item deleted successfully', type: menu_item_response_dto_1.MenuItemResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Menu item not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MenuItemsController.prototype, "remove", null);
exports.MenuItemsController = MenuItemsController = __decorate([
    (0, swagger_1.ApiTags)('Menu Items'),
    (0, common_1.Controller)({ path: 'menu-items', version: '1' }),
    __metadata("design:paramtypes", [menu_items_service_1.MenuItemsService])
], MenuItemsController);
//# sourceMappingURL=menu-items.controller.js.map