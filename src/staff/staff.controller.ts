import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  GetStaffQueryDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  GetSchedulesQueryDto,
  StaffPerformanceQueryDto,
} from './staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { UserType } from '@prisma/client';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(UserType.gym_owner)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStaffDto: CreateStaffDto, @GetCurrentUser() user: any) {
    return this.staffService.createStaff(createStaffDto, user.ownedGyms[0].id);
  }

  @Get()
  @Roles(UserType.gym_owner, UserType.staff)
  async findAll(@Query() query: GetStaffQueryDto, @GetCurrentUser() user: any) {
    return this.staffService.findAllStaff(query, user.ownedGyms[0].id);
  }

  @Get('stats')
  @Roles(UserType.gym_owner)
  async getStats(@GetCurrentUser() user: any) {
    return this.staffService.getStaffStats(user.ownedGyms[0].id);
  }

  @Get(':id')
  @Roles(UserType.gym_owner, UserType.staff)
  async findOne(@Param('id') id: string, @GetCurrentUser() user: any) {
    // Staff can only view their own profile unless they are gym owner
    if (user.userType === UserType.staff && user.id !== id) {
      throw new Error('Access denied');
    }

    let gymId = user.ownedGyms[0].id
    if (!gymId) {
      gymId = user.staff?.gymId
    }

    return this.staffService.findStaffById(id, gymId);
  }

  @Patch(':id')
  @Roles(UserType.gym_owner, UserType.staff)
  async update(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @GetCurrentUser() user: any,
  ) {
    // Staff can only update their own profile and limited fields
    if (user.userType === UserType.staff) {
      if (user.id !== id) {
        throw new Error('Access denied');
      }
      // Remove fields that staff cannot update
      const { role, hireDate, salary, isActive, ...allowedFields } = updateStaffDto;
      return this.staffService.updateStaff(id, allowedFields, user.staff?.id);
    }

    return this.staffService.updateStaff(id, updateStaffDto, user.ownedGyms[0].id);
  }

  @Delete(':id')
  @Roles(UserType.gym_owner)
  async remove(@Param('id') id: string, @GetCurrentUser() user: any) {
    return this.staffService.deleteStaff(id, user.ownedGyms[0].id);
  }

  @Get(':id/performance')
  @Roles(UserType.gym_owner, UserType.staff)
  async getPerformance(
    @Param('id') id: string,
    @Query() query: StaffPerformanceQueryDto,
    @GetCurrentUser() user: any,
  ) {
    // Staff can only view their own performance unless they are gym owner
    if (user.userType === UserType.staff && user.id !== id) {
      throw new Error('Access denied');
    }

    let gymId = user.ownedGyms[0].id
    if (!gymId) {
      gymId = user.staff?.gymId
    }

    return this.staffService.getStaffPerformance(id, gymId, query.startDate, query.endDate);
  }

  // Schedule Management
  @Post('schedules')
  @Roles(UserType.gym_owner, UserType.staff)
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Body() createScheduleDto: CreateScheduleDto, @GetCurrentUser() user: any) {
    // Staff can only create schedules for themselves
    if (user.userType === UserType.staff && user.id !== createScheduleDto.staffId) {
      throw new Error('Access denied');
    }

    let gymId = user.ownedGyms[0].id
    if (!gymId) {
      gymId = user.staff?.gymId
    }

    return this.staffService.createSchedule(createScheduleDto, gymId);
  }

  @Get('schedules')
  @Roles(UserType.gym_owner, UserType.staff)
  async findAllSchedules(@Query() query: GetSchedulesQueryDto, @GetCurrentUser() user: any) {
    // Staff can only view their own schedules
    if (user.userType === UserType.staff) {
      query.staffId = user.id;
    }

    let gymId = user.ownedGyms[0].id
    if (!gymId) {
      gymId = user.staff?.gymId
    }

    return this.staffService.findAllSchedules(query, gymId);
  }

  @Get('schedules/:id')
  @Roles(UserType.gym_owner, UserType.staff)
  async findOneSchedule(@Param('id') id: string, @GetCurrentUser() user: any) {
    let gymId = user.ownedGyms[0].id
    if (!gymId) {
      gymId = user.staff?.gymId
    }

    const schedule = await this.staffService.findScheduleById(id, gymId);

    // Staff can only view their own schedules
    if (user.userType === UserType.staff && user.id !== schedule.staffId) {
      throw new Error('Access denied');
    }

    return schedule;
  }

  @Patch('schedules/:id')
  @Roles(UserType.gym_owner, UserType.staff)
  async updateSchedule(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @GetCurrentUser() user: any,
  ) {
    let gymId = user.ownedGyms[0].id
    if (!gymId) {
      gymId = user.staff?.gymId
    }

    const schedule = await this.staffService.findScheduleById(id, gymId);

    // Staff can only update their own schedules
    if (user.userType === UserType.staff && user.id !== schedule.staffId) {
      throw new Error('Access denied');
    }

    return this.staffService.updateSchedule(id, updateScheduleDto, gymId);
  }

  @Delete('schedules/:id')
  @Roles(UserType.gym_owner, UserType.staff)
  async removeSchedule(@Param('id') id: string, @GetCurrentUser() user: any) {
    let gymId = user.ownedGyms[0].id
    if (!gymId) {
      gymId = user.staff?.gymId
    }

    const schedule = await this.staffService.findScheduleById(id, gymId);

    // Staff can only delete their own schedules
    if (user.userType === UserType.staff && user.id !== schedule.staffId) {
      throw new Error('Access denied');
    }

    return this.staffService.deleteSchedule(id, gymId);
  }
}
