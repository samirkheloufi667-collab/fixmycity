import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { AdminService } from './admin.service';
import { QueueQueryDto, RoleDto, UsersQueryDto } from './dto';

/** Espace des services de la ville. Toutes les routes exigent au moins le rôle d'agent. */
@Controller('admin')
@Roles('AGENT', 'ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('queue')
  queue(@CurrentUser() user: AuthUser, @Query() query: QueueQueryDto) {
    return this.admin.queue(user, query);
  }

  @Get('agents')
  agents() {
    return this.admin.agents();
  }

  @Get('users')
  @Roles('ADMIN')
  users(@Query() query: UsersQueryDto) {
    return this.admin.users(query.q);
  }

  @Patch('users/:id/role')
  @Roles('ADMIN')
  setRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RoleDto) {
    return this.admin.setRole(user, id, dto.role);
  }
}
