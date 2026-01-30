import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(
    @Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto) {
    const [menuItem] = await this.db
      .insert(schema.menuItems)
      .values(createMenuItemDto)
      .returning();
    return menuItem;
  }

  async findAll() {
    return await this.db.select().from(schema.menuItems);
  }

  async findByCategory(category: string) {
    return await this.db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.category, category));
  }

  async findOne(id: number) {
    const [menuItem] = await this.db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.id, id));

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return menuItem;
  }

  async update(id: number, updateMenuItemDto: UpdateMenuItemDto) {
    const [menuItem] = await this.db
      .update(schema.menuItems)
      .set(updateMenuItemDto)
      .where(eq(schema.menuItems.id, id))
      .returning();

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return menuItem;
  }

  async remove(id: number) {
    const [menuItem] = await this.db
      .delete(schema.menuItems)
      .where(eq(schema.menuItems.id, id))
      .returning();

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return menuItem;
  }
}
