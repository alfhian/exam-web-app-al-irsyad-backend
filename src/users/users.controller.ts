import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  Query,
  InternalServerErrorException,
  UseGuards, 
  Req
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // users.controller.ts
  @Get()
  @Roles(Role.ADMIN)
   async getUsers(
    @Query('search') search: string = '',
    @Query('sort') sort = 'name',
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('page') page = '1',
    @Query('limit') limit = '10'
  ) {
    try {
      return await this.usersService.getUsersWithPagination(search, sort, order, Number(page), Number(limit));
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }


  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() body: Partial<User>, @Req() req: Request): Promise<User> {
    const createdBy = (req as any).user['sub'];

    if (!body.name || !body.userid || !body.role) {
      throw new BadRequestException('Missing required fields: name, userid, or role');
    }

    return this.usersService.createUser({
      ...body,
      created_by: createdBy,
    });
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: Partial<User>,
    @Req() req: Request
  ): Promise<User> {
    const updatedBy = (req as any).user['sub'];
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.usersService.updateUser(id, {...body, updated_by: updatedBy});
  }

  @Put(':id/status')
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @Body('updated_at') updatedAt: Date,
    @Req() req: Request
  ): Promise<User> {
    const updatedBy = (req as any).user['sub'];
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.usersService.updateUserStatus(id, isActive, updatedAt, updatedBy);
  }

  @Post('generate-password-siswa')
  @Roles(Role.ADMIN)
  async generatePassword(@Body('password') password: string): Promise<{ updated: number }> {
    if (!password) {
      throw new BadRequestException('Missing required fields: password');
    }
    const updated = await this.usersService.generatePasswordSiswa(password);
    return { updated };
  }

}
