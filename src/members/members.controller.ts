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
  Request,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MembersService } from './members.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  GetMembersQueryDto,
  CheckInOutDto,
  GenerateQrCodeDto,
  CheckInOutHistoryQueryDto,
} from './members.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { UserType } from '@prisma/client';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @Roles('gym_owner', 'staff')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMemberDto: CreateMemberDto, @GetCurrentUser() user: any) {
    return this.membersService.createMember(createMemberDto, user.gymId);
  }

  @Get()
  @Roles('gym_owner', 'staff')
  async findAll(@Query() query: GetMembersQueryDto, @GetCurrentUser() user: CurrentUser) {
    return this.membersService.findAllMembers(query, user.staff?.gymId || user.ownedGyms[0].id);
  }

  @Get('dashboard')
  @Roles('gym_owner', 'staff')
  async findAllDashboard(@Query() query: GetMembersQueryDto, @GetCurrentUser() user: CurrentUser) {
    return this.membersService.findAllMembersDashboard(query, user.staff?.gymId || user.ownedGyms[0].id);
  }

  @Get('gym-memberships')
  @Roles('member')
  async getCheck(@GetCurrentUser() user: CurrentUser) {
    return await this.membersService.findMemberCheckInStats(user.id)
  }

  @Get('stats')
  @Roles(UserType.gym_owner, UserType.staff)
  async getStats(@GetCurrentUser() user: any) {
    return this.membersService.getMemberStats(user.gymId);
  }

  @Get(':id')
  @Roles('gym_owner', 'staff', 'member')
  async findOne(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    // Members can only view their own profile
    if (user.userType === 'member' && user.id !== id) {
      throw new Error('Access denied');
    }

    const gymId = user.userType == 'member' ? user.gymId[0] : user.userType === 'gym_owner' ? user.ownedGyms[0].id : user.staff.gymId 

    return this.membersService.findMemberByMemberId(id, gymId);
  }

  @Get(':id/active-membership')
  @Roles('gym_owner', 'staff')
  async findOneWithStatusTransaction(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    // Members can only view their own profile
    if (user.userType === 'member' && user.id !== id) {
      throw new Error('Access denied');
    }

    const gymId = user.userType == 'member' ? user.gymId[0] : user.userType === 'gym_owner' ? user.ownedGyms[0].id : user.staff.gymId 

    const result = await this.membersService.findMemberByMemberIdWithTransaction(id, gymId);
    return {
      ...result.member,
      transactionItems: result.transactionItem
    }
  }

  @Patch(':id')
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  async update(
    @Param('id') id: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @GetCurrentUser() user: any,
  ) {
    // Members can only update their own profile and limited fields
    if (user.userType === UserType.member) {
      if (user.id !== id) {
        throw new Error('Access denied');
      }
      // Remove fields that members cannot update
      const {
        membershipStatus,
        membershipType,
        membershipStartDate,
        membershipEndDate,
        isActive,
        ...allowedFields
      } = updateMemberDto;
      return this.membersService.updateMember(id, allowedFields, user.gymId);
    }

    return this.membersService.updateMember(id, updateMemberDto, user.gymId);
  }

  @Delete(':id')
  @Roles(UserType.gym_owner)
  async remove(@Param('id') id: string, @GetCurrentUser() user: any) {
    return this.membersService.deleteMember(id, user.gymId);
  }

  @Post('check-in-out')
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  @HttpCode(HttpStatus.OK)
  async checkInOut(@Body() checkInOutDto: CheckInOutDto, @GetCurrentUser() user: CurrentUser) {
    // Members can only check themselves in/out

    if (user.userType === UserType.member && !user.gymId.includes(checkInOutDto.gymId)) {
      throw new ForbiddenException('Access denied');
    }

    let gymId
    if (user.userType === UserType.member) {
      if (!checkInOutDto.gymId) {
        throw new BadRequestException('gym id is required')
      }
      gymId = checkInOutDto.gymId
    } else {
      gymId = user.userType === UserType.gym_owner ? user.ownedGyms[0].id : user.staff.gymId
    }


    const result = await this.membersService.checkInOut(checkInOutDto, gymId);
    return {
      ...result.checkInOut,
      lastCheckInOut: result.lastCheckInOut
    }
  }

  @Post('generate-qr')
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  @HttpCode(HttpStatus.OK)
  async generateQrCode(@Body() generateQrCodeDto: GenerateQrCodeDto, @GetCurrentUser() user: any) {
    // Members can only generate QR code for themselves
    if (user.userType === UserType.member && user.id !== generateQrCodeDto.memberId) {
      throw new Error('Access denied');
    }

    return this.membersService.generateQrCode(generateQrCodeDto, user.gymId);
  }

  @Get(':id/check-in-out-history')
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  async getCheckInOutHistory(
    @Param('id') id: string,
    @Query() query: CheckInOutHistoryQueryDto,
    @GetCurrentUser() user: any,
  ) {
    // Members can only view their own history
    if (user.userType === UserType.member && user.id !== id) {
      throw new Error('Access denied');
    }

    return this.membersService.getCheckInOutHistory(id, user.gymId, query.page, query.limit);
  }

  @Get(':memberId/check-in-out-gym-history')
  @Roles(UserType.member)
  async getCheckInOutHistoryByGymId(
    @Param('memberId') id: string,
    @Query() query: CheckInOutHistoryQueryDto,
  ) {
    // Members can only view their own history

    return this.membersService.getCheckInOutHistoryByMemberId(id, query.page, query.limit);
  }
}
