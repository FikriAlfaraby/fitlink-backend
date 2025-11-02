import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GymService } from './gym.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RegisterGymDto } from './dto/register-gym.dto';
import { CurrentUser, GetCurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('gyms')
@UseGuards(JwtAuthGuard)
export class GymController {
  constructor(private readonly gymService: GymService) {}

  @Get('code/:code')
  @UseGuards(RolesGuard)
  @Roles('member', 'super_admin')
  async findGymByCode(@Param('code') code: string) {
    return await this.gymService.findGymByCode(code)
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'gym_owner', 'staff')
  async findGymById(@Param('id') id: string) {
    return await this.gymService.findGymById(id)
  }


  @Post('/register')
  async registerToGym(@Body() dto: RegisterGymDto, @GetCurrentUser() user: CurrentUser) {
    console.log('test')
    return await this.gymService.registerToGym(dto, user.id)
  }
}
