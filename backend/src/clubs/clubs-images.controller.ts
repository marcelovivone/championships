import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

/**
 * Controller for serving club images
 */
@ApiTags('clubs')
@Controller({ path: 'clubs/images', version: '1' })
export class ClubsImagesController {
  /**
   * GET /clubs/images/:filename
   * Serve a club image from the server
   */
  @ApiOperation({ summary: 'Serve a club image' })
  @ApiResponse({ status: 200, description: 'Image file' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @Get(':filename')
  async serveImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Prevent path traversal attacks
    const safeFilename = filename.replace(/\.\./g, '');
    
    // Try multiple possible image directories
    const possiblePaths = [
      join(process.cwd(), 'uploads', 'clubs', safeFilename),
      join(process.cwd(), 'public', 'images', 'clubs', safeFilename),
      join(process.cwd(), 'images', 'clubs', safeFilename),
    ];

    for (const filePath of possiblePaths) {
      if (existsSync(filePath)) {
        const fileStream = createReadStream(filePath);
        
        // Set content type based on file extension
        const ext = filePath.split('.').pop()?.toLowerCase();
        const contentTypes: { [key: string]: string } = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          svg: 'image/svg+xml',
          webp: 'image/webp',
        };
        
        res.setHeader('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
        fileStream.pipe(res);
        return;
      }
    }

    throw new NotFoundException(`Image ${filename} not found`);
  }
}
