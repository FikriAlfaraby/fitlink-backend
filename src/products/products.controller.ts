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
  HttpException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  GetProductsQueryDto,
  CreateClassDto,
  UpdateClassDto,
  GetClassesQueryDto,
  CreateBookingDto,
  UpdateBookingDto,
  GetBookingsQueryDto,
  ProductStatsResponseDto,
} from './products.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, GetCurrentUser } from '@/auth/decorators/current-user.decorator';


@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Product Management
  @Post()
  @Roles('gym_owner')
  async createProduct(@Body() createProductDto: CreateProductDto, @GetCurrentUser() user: CurrentUser) {
    try {
      const gymId = user.ownedGyms[0].id;
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.productsService.createProduct(createProductDto, gymId);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpException('Product name already exists', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Get()
  @Roles('gym_owner', 'staff', 'member')
  async findAllProducts(@Query() query: GetProductsQueryDto, @Request() req, @GetCurrentUser() user: CurrentUser) {
    const gymId = user.userType === 'super_admin' ? undefined : (user.gymId[0] || user.ownedGyms[0].id || user.staff.gymId);
    console.log('gym id logged user', gymId)
    console.log('logged user', user)
    return await this.productsService.findAllProducts(query, gymId);
  }

  @Get('stats')
  @Roles('gym_owner', 'staff')
  async getProductStats(@Request() req): Promise<ProductStatsResponseDto> {
    const gymId = req.user.userType === 'super_admin' ? undefined : req.user.gymId || req.user.ownedGyms[0].id || req.user.staff.gymId;
    return await this.productsService.getProductStats(gymId);
  }

  @Get(':id')
  @Roles('gym_owner', 'staff', 'member')
  async findOneProduct(@Param('id') id: string, @Request() req) {
    const gymId = req.user.userType === 'super_admin' ? undefined : req.user.gymId;
    const product = await this.productsService.findOneProduct(id, gymId);
    
    return product;
  }

  @Patch(':id')
  @Roles('gym_owner')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    const gymId = req.user.ownedGyms[0].id;
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.productsService.updateProduct(id, updateProductDto, gymId);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpException('Product name already exists', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles('gym_owner')
  async removeProduct(@Param('id') id: string, @Request() req) {
    const gymId = req.user.gymId;
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.productsService.removeProduct(id, gymId);
    } catch (error) {
      if (error.message.includes('active classes')) {
        throw new HttpException(
          'Cannot delete product with active classes',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  // Class Management
  @Post('classes')
  @Roles('gym_owner', 'staff')
  async createClass(@Body() createClassDto: CreateClassDto, @Request() req) {
    try {
      const gymId = req.user.gymId;
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.productsService.createClass(createClassDto, gymId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('conflict')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Get('classes')
  @Roles('gym_owner', 'staff', 'member')
  async findAllClasses(@Query() query: GetClassesQueryDto, @Request() req) {
    const gymId = req.user.userType === 'super_admin' ? undefined : req.user.gymId;
    return await this.productsService.findAllClasses(query, gymId);
  }

  @Get('classes/:id')
  @Roles('gym_owner', 'staff', 'member')
  async findOneClass(@Param('id') id: string, @Request() req) {
    const gymId = req.user.userType === 'super_admin' ? undefined : req.user.gymId;
    const classItem = await this.productsService.findOneClass(id, gymId);
    
    return classItem;
  }

  @Patch('classes/:id')
  @Roles('gym_owner', 'staff')
  async updateClass(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
    @Request() req,
  ) {
    const gymId = req.user.gymId;
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.productsService.updateClass(id, updateClassDto, gymId);
    } catch (error) {
      if (error.message.includes('conflict')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Delete('classes/:id')
  @Roles('gym_owner', 'staff')
  async removeClass(@Param('id') id: string, @Request() req) {
    const gymId = req.user.gymId;
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.productsService.deleteClass(id, gymId);
    } catch (error) {
      if (error.message.includes('confirmed bookings')) {
        throw new HttpException(
          'Cannot delete class with confirmed bookings',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  // Booking Management
  @Post('bookings')
  @Roles('member')
  async createBooking(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    try {
      const gymId = req.user.gymId;
      const memberId = req.user.id;
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.productsService.createBooking(createBookingDto, gymId, memberId);
    } catch (error) {
      if (error.message.includes('not available')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.message.includes('already booked')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      if (error.message.includes('capacity reached')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Get('bookings')
  @Roles('gym_owner', 'staff', 'member')
  async findAllBookings(@Query() query: GetBookingsQueryDto, @Request() req) {
    let memberId: string | undefined;
    let gymId: string | undefined;
    
    if (req.user.userType === 'member') {
      memberId = req.user.id;
      gymId = req.user.gymId;
    } else if (req.user.userType !== 'super_admin') {
      gymId = req.user.gymId;
    }
    
    return await this.productsService.findAllBookings(query, gymId, memberId);
  }

  @Get('bookings/:id')
  @Roles('gym_owner', 'staff', 'member')
  async findOneBooking(@Param('id') id: string, @Request() req) {
    const gymId = req.user.userType === 'super_admin' ? undefined : req.user.gymId;
    const booking = await this.productsService.findOneBooking(id, gymId);
    
    // Check access permissions for members
    if (req.user.userType === 'member' && booking.memberId !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    
    return booking;
  }

  @Patch('bookings/:id')
  @Roles('gym_owner', 'staff', 'member')
  async updateBooking(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req,
  ) {
    const gymId = req.user.userType === 'super_admin' ? undefined : req.user.gymId;
    const booking = await this.productsService.findOneBooking(id, gymId);
    
    // Check access permissions for members
    if (req.user.userType === 'member' && booking.memberId !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    
    return await this.productsService.updateBooking(id, updateBookingDto, gymId);
  }

  @Delete('bookings/:id')
  @Roles('gym_owner', 'staff', 'member')
  async cancelBooking(@Param('id') id: string, @Request() req) {
    const gymId = req.user.userType === 'super_admin' ? undefined : req.user.gymId;
    const booking = await this.productsService.findOneBooking(id, gymId);
    
    // Check access permissions for members
    if (req.user.userType === 'member' && booking.memberId !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    
    try {
      const memberId = req.user.userType === 'member' ? req.user.id : undefined;
      return await this.productsService.cancelBooking(id, gymId, memberId);
    } catch (error) {
      if (error.message.includes('cancellation period')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}