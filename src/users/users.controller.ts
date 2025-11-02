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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  ChangePinDto,
  ResetPasswordDto,
  GetUsersQueryDto,
} from './dto/users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('gym_owner', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  @Roles('gym_owner', 'staff', 'super_admin')
  async findAll(@Query() query: GetUsersQueryDto, @GetCurrentUser() user: CurrentUser) {
    // Filter by gym for non-super_admin users
    const filters = {
      ...query,
      gymId: user.userType === 'super_admin' ? query.gymId : user.gymId[0],
    };

    return this.usersService.findAll(filters);
  }

  @Get('stats')
  @Roles('gym_owner', 'staff', 'super_admin')
  async getStats(@GetCurrentUser() user: CurrentUser) {
    const gymId = user.userType === 'super_admin' ? undefined : user.gymId[0];
    return this.usersService.getUserStats(gymId);
  }

  @Get('profile')
  async getProfile(@GetCurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetCurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetCurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Patch('change-pin')
  @HttpCode(HttpStatus.OK)
  async changePin(@GetCurrentUser('id') userId: string, @Body() changePinDto: ChangePinDto) {
    return this.usersService.changePin(userId, changePinDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @Get(':id')
  @Roles('gym_owner', 'staff', 'super_admin')
  async findOne(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    const targetUser = await this.usersService.findOne(id);

    // Check if user has access to this user's data
    if (user.userType !== 'super_admin') {
      const targetGymId =
        targetUser.member?.find(v => v.gymId === user.gymId[0]).gym?.id || targetUser.staff?.gym?.id || targetUser.ownedGyms?.[0]?.id;

      if (targetGymId !== user.gymId[0]) {
        throw new Error('Access denied to this user');
      }
    }

    return targetUser;
  }

  @Patch(':id')
  @Roles('gym_owner', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    // Check access permissions
    if (user.userType !== 'super_admin') {
      const targetUser = await this.usersService.findOne(id);
      const targetGymId =
        targetUser.member?.find(v => v.gymId === user.gymId[0]).gym?.id || targetUser.staff?.gym?.id || targetUser.ownedGyms?.[0]?.id;

      if (targetGymId !== user.gymId[0]) {
        throw new Error('Access denied to this user');
      }
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('gym_owner', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    // Check access permissions
    if (user.userType !== 'super_admin') {
      const targetUser = await this.usersService.findOne(id);
      const targetGymId =
        targetUser.member?.find(v => v.gymId === user.gymId[0]).gym?.id || targetUser.staff?.gym?.id || targetUser.ownedGyms?.[0]?.id;

      if (targetGymId !== user.gymId[0]) {
        throw new Error('Access denied to this user');
      }
    }

    return this.usersService.remove(id);
  }
}
