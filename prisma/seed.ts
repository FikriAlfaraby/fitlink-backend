import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create a sample gym owner
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const gymOwner = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'owner@fitlink.com',
      passwordHash: hashedPassword,
      name: 'John Doe',
      phone: '+6281234567890',
      userType: 'gym_owner',
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log('✅ Created gym owner:', gymOwner.email);

  // Create a sample gym
  const gym = await prisma.gym.create({
    data: {
      id: uuidv4(),
      ownerId: gymOwner.id,
      name: 'FitLink Gym',
      code: 'FG01',
      address: 'Jl. Sudirman No. 123, Jakarta',
      phone: '+6281234567891',
      email: 'info@fitlinkgym.com',
      description: 'Modern fitness center with complete facilities',
      status: 'active',
      settings: {
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '07:00', close: '21:00' },
          sunday: { open: '07:00', close: '21:00' },
        },
        features: ['parking', 'wifi', 'locker', 'shower', 'ac'],
        membershipTypes: ['basic', 'premium', 'vip'],
      },
    },
  });

  console.log('✅ Created gym:', gym.name);

  // Create sample staff
  const staffUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'trainer@fitlink.com',
      passwordHash: hashedPassword,
      name: 'Jane Smith',
      phone: '+6281234567892',
      userType: 'staff',
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const staff = await prisma.staff.create({
    data: {
      id: uuidv4(),
      userId: staffUser.id,
      gymId: gym.id,
      employeeId: 'EMP001',
      role: 'Personal Trainer',
      department: 'Fitness',
      hireDate: new Date('2024-01-01'),
      salary: 5000000,
      address: 'Jl. Thamrin No. 456, Jakarta',
      emergencyContact: {
        name: 'John Smith',
        phone: '+6281234567893',
        relationship: 'Spouse',
      },
      certifications: [
        { name: 'Certified Personal Trainer', issuer: 'ACSM', year: 2023 },
        { name: 'Nutrition Specialist', issuer: 'NASM', year: 2022 },
      ],
      goals: {
        monthly: {
          clientSessions: 100,
          newClients: 5,
          retention: 90,
        },
      },
      status: 'active',
    },
  });

  console.log('✅ Created staff:', staffUser.name);

  // Create sample member with email/password
  const memberUser1 = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'member@fitlink.com',
      passwordHash: hashedPassword,
      name: 'Alice Johnson',
      phone: '+6281234567894',
      userType: 'member',
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
      emergencyContact: {
        name: 'Bob Johnson',
        phone: '+6281234567895',
        relationship: 'Spouse',
      },
    },
  });

  const member1 = await prisma.member.create({
    data: {
      id: uuidv4(),
      userId: memberUser1.id,
      gymId: gym.id,
      memberCode: 'MEM001',
      membershipType: 'premium',
      membershipStatus: 'active',
      joinDate: new Date('2024-01-15'),
      membershipExpiry: new Date('2024-12-31'),
      totalVisits: 25,
      qrCode: `QR_${uuidv4()}`,
    },
  });

  console.log('✅ Created member (email):', memberUser1.name);

  // Create sample member with phone/PIN
  const pinHash = await bcrypt.hash('123456', 10);
  const memberUser2 = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: 'Mobile User',
      phone: '+6281234567896',
      pinHash: pinHash,
      userType: 'member',
      status: 'active',
      phoneVerified: true,
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+6281234567897',
        relationship: 'Family',
      },
    },
  });

  const member2 = await prisma.member.create({
    data: {
      id: uuidv4(),
      userId: memberUser2.id,
      gymId: gym.id,
      memberCode: 'MEM002',
      membershipType: 'basic',
      membershipStatus: 'active',
      joinDate: new Date('2024-02-01'),
      membershipExpiry: new Date('2024-12-31'),
      totalVisits: 10,
      qrCode: `QR_${uuidv4()}`,
    },
  });

  console.log('✅ Created member (mobile):', memberUser2.name);

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        id: uuidv4(),
        gymId: gym.id,
        name: 'Basic Membership',
        description: 'Access to gym facilities and basic equipment',
        price: 300000,
        category: 'membership',
        duration: 30, // 30 days
        features: ['gym_access', 'locker', 'basic_equipment'],
        status: 'active',
      },
    }),
    prisma.product.create({
      data: {
        id: uuidv4(),
        gymId: gym.id,
        name: 'Premium Membership',
        description: 'Full access including classes and personal training',
        price: 500000,
        category: 'membership',
        duration: 30,
        features: ['gym_access', 'classes', 'personal_training', 'locker', 'towel'],
        status: 'active',
      },
    }),
    prisma.product.create({
      data: {
        id: uuidv4(),
        gymId: gym.id,
        name: 'Yoga Class',
        description: 'Relaxing yoga session for all levels',
        price: 75000,
        category: 'class',
        duration: 60, // 60 minutes
        capacity: 20,
        features: ['mat_provided', 'beginner_friendly'],
        status: 'active',
      },
    }),
  ]);

  console.log('✅ Created products:', products.length);

  // Create sample classes
  const yogaClass = await prisma.class.create({
    data: {
      id: uuidv4(),
      gymId: gym.id,
      productId: products[2].id, // Yoga Class product
      name: 'Morning Yoga',
      instructorId: staff.id,
      type: 'yoga',
      scheduleDay: 'monday',
      scheduleTime: new Date('1970-01-01T07:00:00Z'),
      duration: 60,
      capacity: 20,
      booked: 5,
      waitlist: 0,
      room: 'Studio A',
      price: 75000,
      status: 'active',
      date: new Date('2024-02-05'),
    },
  });

  console.log('✅ Created class:', yogaClass.name);

  // Create sample wallets
  const wallets = await Promise.all([
    prisma.wallet.create({
      data: {
        id: uuidv4(),
        gymId: gym.id,
        walletType: 'qris',
        currentBalance: 1500000,
        initialBalance: 0,
        totalIncome: 2000000,
        totalWithdrawals: 500000,
        totalFees: 25000,
        todayIncome: 150000,
        isActive: true,
        canWithdraw: true,
        minWithdrawal: 100000,
      },
    }),
    prisma.wallet.create({
      data: {
        id: uuidv4(),
        gymId: gym.id,
        walletType: 'bank_transfer',
        currentBalance: 3000000,
        initialBalance: 1000000,
        totalIncome: 5000000,
        totalWithdrawals: 2000000,
        totalFees: 50000,
        todayIncome: 300000,
        isActive: true,
        canWithdraw: true,
        minWithdrawal: 500000,
      },
    }),
  ]);

  console.log('✅ Created wallets:', wallets.length);

  // Create sample discount
  const discount = await prisma.discount.create({
    data: {
      id: uuidv4(),
      gymId: gym.id,
      code: 'WELCOME20',
      name: 'Welcome Discount',
      description: '20% off for new members',
      type: 'percentage',
      value: 20,
      minPurchase: 200000,
      maxDiscount: 100000,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      usageLimit: 100,
      usedCount: 15,
      isActive: true,
      memberTiers: ['basic', 'premium'],
      applicableProducts: [products[0].id, products[1].id],
      conditions: {
        firstTimeOnly: true,
        minAge: 18,
      },
    },
  });

  console.log('✅ Created discount:', discount.code);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });