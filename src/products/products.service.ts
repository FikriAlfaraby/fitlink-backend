import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateClassDto,
  UpdateClassDto,
  CreateBookingDto,
  UpdateBookingDto,
  GetProductsQueryDto,
  GetClassesQueryDto,
  GetBookingsQueryDto,
} from './products.dto';
import { ProductCategory, BookingStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: DatabaseService,
    private configService: ConfigService,
  ) {}

  // Product Management
  async createProduct(createProductDto: CreateProductDto, gymId: string) {
    const {
      name,
      category,
      price,
      duration,
      isActive,
      maxParticipants,
      minParticipants,
      imageUrl,
      features
    } = createProductDto;

    // Check if product name already exists in the gym
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        name,
        gymId,
      },
    });

    if (existingProduct) {
      throw new BadRequestException('Product name already exists');
    }

    return this.prisma.product.create({
      data: {
        name,
        category,
        price,
        duration,
        status: isActive ? 'active' : 'inactive',
        capacity: maxParticipants,
        gymId,
        features
      },
    });
  }

  async findAllProducts(query: GetProductsQueryDto, gymId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isActive,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      gymId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.status = isActive ? 'active' : 'inactive';
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          classes: {
            take: 5,
            orderBy: { date: 'asc' },
          },
          _count: {
            select: {
              classes: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy === 'startTime' ? 'date' : sortBy]: sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneProduct(id: string, gymId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        gymId,
      },
      include: {
        classes: {
          take: 5,
          orderBy: { date: 'asc' },
        },
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findProductById(id: string, gymId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        gymId,
      },
      include: {
        classes: {
          orderBy: { date: 'asc' },
          include: {
            instructor: {
              include: {
                user: true,
              },
            },
            _count: {
              select: {
                bookings: {
                  where: {
                    bookingStatus: BookingStatus.booked,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto, gymId: string) {
    const product = await this.findProductById(id, gymId);

    const { name } = updateProductDto;

    // Check for name conflicts
    if (name && name !== product.name) {
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          name,
          gymId,
          id: { not: id },
        },
      });
      if (existingProduct) {
        throw new BadRequestException('Product name already exists');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        updatedAt: new Date(),
      },
    });
  }

  async deleteProduct(id: string, gymId: string) {
    const product = await this.findProductById(id, gymId);

    // Check if product has active classes
    const activeClasses = await this.prisma.class.count({
      where: {
        productId: id,
        status: 'active',
      },
    });

    if (activeClasses > 0) {
      throw new BadRequestException('Cannot delete product with active classes');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        status: 'inactive',
      },
    });
  }

  async removeProduct(id: string, gymId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, gymId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if product has active classes
    const activeClasses = await this.prisma.class.count({
      where: {
        productId: id,
        status: 'active',
      },
    });

    if (activeClasses > 0) {
      throw new BadRequestException('Cannot delete product with active classes');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Class Management
  async createClass(createClassDto: CreateClassDto, gymId: string) {
    const { productId, instructorId, name, date, scheduleTime, capacity, price } = createClassDto;

    // Verify product exists
    await this.findProductById(productId, gymId);

    // Verify instructor exists and belongs to gym
    const instructor = await this.prisma.staff.findFirst({
      where: {
        id: instructorId,
        gymId,
        role: 'TRAINER',
        status: 'active',
      },
      include: {
        user: true,
      },
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found or not a trainer');
    }

    // Check for instructor schedule conflicts
    const conflictingClass = await this.prisma.class.findFirst({
      where: {
        instructorId,
        gymId,
        date: new Date(date),
        scheduleTime,
      },
    });

    if (conflictingClass) {
      throw new BadRequestException('Instructor has a conflicting class schedule');
    }

    return this.prisma.class.create({
      data: {
        productId,
        instructorId,
        gymId,
        name,
        // description,
        date: new Date(date),
        scheduleTime,
        capacity,
        price,
        status: 'active',
      },
      include: {
        product: true,
        instructor: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            bookings: {
              where: {
                bookingStatus: BookingStatus.booked,
              },
            },
          },
        },
      },
    });
  }

  async findAllClasses(query: GetClassesQueryDto, gymId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      productId,
      instructorId,
      status,
      startDate,
      endDate,
      // isRecurring,
      sortBy = 'date',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      gymId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (productId) {
      where.productId = productId;
    }

    if (instructorId) {
      where.instructorId = instructorId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const [classes, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        include: {
          product: true,
          instructor: {
            include: {
              user: true,
            },
          },
          _count: {
            select: {
              bookings: {
                where: {
                  bookingStatus: BookingStatus.booked,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      data: classes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findClassById(id: string, gymId: string) {
    const classItem = await this.prisma.class.findFirst({
      where: {
        id,
        gymId,
      },
      include: {
        product: true,
        instructor: {
          include: {
            user: true,
          },
        },
        bookings: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { class: { createdAt: 'desc' } },
        },
        _count: {
          select: {
            bookings: {
              where: {
                bookingStatus: BookingStatus.booked,
              },
            },
          },
        },
      },
    });

    if (!classItem) {
      throw new NotFoundException('Class not found');
    }

    return classItem;
  }

  async findOneClass(id: string, gymId: string) {
    const classItem = await this.prisma.class.findFirst({
      where: {
        id,
        gymId,
      },
      include: {
        product: true,
        instructor: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            bookings: {
              where: {
                bookingStatus: BookingStatus.booked,
              },
            },
          },
        },
      },
    });

    if (!classItem) {
      throw new NotFoundException('Class not found');
    }

    return classItem;
  }

  async updateClass(id: string, updateClassDto: UpdateClassDto, gymId: string) {
    const classItem = await this.findClassById(id, gymId);

    const { instructorId, date, scheduleTime } = updateClassDto;

    // Check for instructor schedule conflicts (if instructor or time is being changed)
    if (instructorId || date || scheduleTime) {
      const newInstructorId = instructorId || classItem.instructorId;
      const newDate = date ? new Date(date) : classItem.date;
      const newScheduleTime = scheduleTime || classItem.scheduleTime;

      const conflictingClass = await this.prisma.class.findFirst({
        where: {
          instructorId: newInstructorId,
          gymId,
          id: { not: id },
          date: newDate,
          scheduleTime: newScheduleTime,
        },
      });

      if (conflictingClass) {
        throw new BadRequestException('Instructor has a conflicting class schedule');
      }
    }

    const updateData: any = {};
    
    // Only include fields that exist in the Class schema
    if (updateClassDto.instructorId !== undefined) updateData.instructorId = updateClassDto.instructorId;
    if (updateClassDto.name !== undefined) updateData.name = updateClassDto.name;
    if (updateClassDto.date !== undefined) updateData.date = updateClassDto.date ? new Date(updateClassDto.date) : null;
    if (updateClassDto.scheduleTime !== undefined) {
      // Convert scheduleTime string to DateTime for time field
      const [hours, minutes] = updateClassDto.scheduleTime.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updateData.scheduleTime = timeDate;
    }
    if (updateClassDto.capacity !== undefined) updateData.capacity = updateClassDto.capacity;
    if (updateClassDto.price !== undefined) updateData.price = updateClassDto.price;
    if (updateClassDto.status !== undefined) updateData.status = updateClassDto.status;

    return this.prisma.class.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
        instructor: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async deleteClass(id: string, gymId: string) {
    const classItem = await this.findClassById(id, gymId);

    // Check if class has confirmed bookings
    const confirmedBookings = await this.prisma.classBooking.count({
      where: {
        classId: id,
        bookingStatus: BookingStatus.booked,
      },
    });

    if (confirmedBookings > 0) {
      throw new BadRequestException('Cannot delete class with confirmed bookings');
    }

    return this.prisma.class.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });
  }

  // Booking Management
  async createBooking(createBookingDto: CreateBookingDto, gymId: string, memberId: string) {
    const { classId } = createBookingDto;

    const classItem = await this.findClassById(classId, gymId);

    // Check if class is available for booking
    if (classItem.status !== 'active') {
      throw new BadRequestException('Class is not available for booking');
    }

    if (classItem.date <= new Date()) {
      throw new BadRequestException('Cannot book past classes');
    }

    // Check if member already has a booking for this class
    const existingBooking = await this.prisma.classBooking.findFirst({
      where: {
        classId,
        memberId,
        bookingStatus: { in: [BookingStatus.booked, BookingStatus.waitlist] },
      },
    });

    if (existingBooking) {
      throw new BadRequestException('Member already has a booking for this class');
    }

    // Check if class is full
    const confirmedBookings = await this.prisma.classBooking.count({
      where: {
        classId,
        bookingStatus: BookingStatus.booked,
      },
    });

    if (confirmedBookings >= classItem.capacity) {
      throw new BadRequestException('Class is full');
    }

    return this.prisma.classBooking.create({
      data: {
        classId,
        memberId,
        bookingStatus: BookingStatus.booked,
        // notes,
      },
      include: {
        class: {
          include: {
            product: true,
            instructor: {
              include: {
                user: true,
              },
            },
          },
        },
        member: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findAllBookings(query: GetBookingsQueryDto, gymId: string, memberId?: string) {
    const {
      page = 1,
      limit = 10,
      classId,
      bookingStatus,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      gymId,
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (classId) {
      where.classId = classId;
    }

    if (bookingStatus) {
      where.bookingStatus = bookingStatus;
    }

    if (startDate || endDate) {
      where.class = {};
      if (startDate) {
        where.class.date = { gte: new Date(startDate) };
      }
      if (endDate) {
        where.class.date = { ...where.class.date, lte: new Date(endDate) };
      }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.classBooking.findMany({
        where,
        include: {
          class: {
            include: {
              product: true,
              instructor: {
                include: {
                  user: true,
                },
              },
            },
          },
          member: {
            include: {
              user: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.classBooking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBookingById(id: string, gymId: string) {
    const booking = await this.prisma.classBooking.findFirst({
      where: {
        id,
        class: {
          gymId,
        },
      },
      include: {
        class: {
          include: {
            product: true,
            instructor: {
              include: {
                user: true,
              },
            },
          },
        },
        member: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async findOneBooking(id: string, gymId: string) {
    const booking = await this.prisma.classBooking.findFirst({
      where: {
        id,
        class: {
          gymId,
        },
      },
      include: {
        class: {
          include: {
            product: true,
            instructor: {
              include: {
                user: true,
              },
            },
          },
        },
        member: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateBooking(id: string, updateBookingDto: UpdateBookingDto, gymId: string) {
    const booking = await this.findBookingById(id, gymId);

    return this.prisma.classBooking.update({
      where: { id },
      data: {
        ...updateBookingDto,
      },
      include: {
        class: {
          include: {
            product: true,
            instructor: {
              include: {
                user: true,
              },
            },
          },
        },
        member: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async cancelBooking(id: string, gymId: string, memberId?: string) {
    const booking = await this.findBookingById(id, gymId);

    // If memberId is provided, ensure the booking belongs to the member
    if (memberId && booking.memberId !== memberId) {
      throw new BadRequestException('Booking does not belong to this member');
    }

    // Check if booking can be cancelled (e.g., not too close to class time)
    const hoursUntilClass =
      (booking.class.date.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursUntilClass < 2) {
      throw new BadRequestException('Cannot cancel booking less than 2 hours before class');
    }

    return this.prisma.classBooking.update({
      where: { id },
      data: {
        bookingStatus: BookingStatus.cancelled,
      },
    });
  }

  async getProductStats(gymId: string) {
    const [totalProducts, activeProducts, totalClasses, upcomingClasses, totalBookings] =
      await Promise.all([
        this.prisma.product.count({
          where: {
            gymId,
          },
        }),
        this.prisma.product.count({
          where: {
            gymId,
            status: 'active',
          },
        }),
        this.prisma.class.count({
          where: {
            gymId,
          },
        }),
        this.prisma.class.count({
          where: {
            gymId,
            date: { gt: new Date() },
            status: 'active',
          },
        }),
        this.prisma.classBooking.count({
          where: {
            class: {
              gymId,
            },
            bookingStatus: BookingStatus.booked,
          },
        }),
      ]);

    return {
      totalProducts,
      activeProducts,
      totalClasses,
      upcomingClasses,
      totalBookings,
    };
  }
}
