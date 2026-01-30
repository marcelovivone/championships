import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';

@ApiTags('Menu Items')
@Controller({ path: 'menu-items', version: '1' })
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: 201, description: 'Menu item created successfully', type: MenuItemResponseDto })
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemsService.create(createMenuItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all menu items' })
  @ApiResponse({ status: 200, description: 'List of all menu items', type: [MenuItemResponseDto] })
  findAll(@Query('category') category?: string) {
    if (category) {
      return this.menuItemsService.findByCategory(category);
    }
    return this.menuItemsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a menu item by ID' })
  @ApiResponse({ status: 200, description: 'Menu item found', type: MenuItemResponseDto })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiResponse({ status: 200, description: 'Menu item updated successfully', type: MenuItemResponseDto })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  update(@Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return this.menuItemsService.update(+id, updateMenuItemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiResponse({ status: 200, description: 'Menu item deleted successfully', type: MenuItemResponseDto })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(+id);
  }
}
