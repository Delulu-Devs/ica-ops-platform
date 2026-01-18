// Database seed script - creates sample data for development

import { hashPassword } from '../lib/password';
import { db } from './index';
import { accounts, batches, coaches, demos, plans, students } from './schema';

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Clean existing data (in reverse order of dependencies)
    console.log('🧹 Cleaning existing data...');
    await db.delete(demos);
    await db.delete(students);
    await db.delete(batches);
    await db.delete(coaches);
    await db.delete(plans);
    await db.delete(accounts);

    // Create admin account
    console.log('👤 Creating admin account...');
    const adminPassword = await hashPassword('Admin123!');
    const adminResult = await db
      .insert(accounts)
      .values({
        email: 'admin@ica.com',
        passwordHash: adminPassword,
        role: 'ADMIN',
      })
      .returning();
    const admin = adminResult[0];
    if (!admin) throw new Error('Failed to create admin account');
    console.log(`   ✓ Admin: admin@ica.com / Admin123!`);

    // Create coach accounts
    console.log('👨‍🏫 Creating coach accounts...');
    const coachPassword = await hashPassword('Coach123!');

    const coachAccount1Result = await db
      .insert(accounts)
      .values({
        email: 'coach1@ica.com',
        passwordHash: coachPassword,
        role: 'COACH',
      })
      .returning();
    const coachAccount1 = coachAccount1Result[0];
    if (!coachAccount1) throw new Error('Failed to create coach account 1');

    const coachAccount2Result = await db
      .insert(accounts)
      .values({
        email: 'coach2@ica.com',
        passwordHash: coachPassword,
        role: 'COACH',
      })
      .returning();
    const coachAccount2 = coachAccount2Result[0];
    if (!coachAccount2) throw new Error('Failed to create coach account 2');

    // Create coach profiles
    const coach1Result = await db
      .insert(coaches)
      .values({
        accountId: coachAccount1.id,
        name: 'Vikram Sharma',
        bio: 'International Master with 15 years of coaching experience',
        rating: 2400,
        specializations: ['Opening Theory', 'Endgame', 'Tactics'],
      })
      .returning();
    const coach1 = coach1Result[0];
    if (!coach1) throw new Error('Failed to create coach 1 profile');

    const coach2Result = await db
      .insert(coaches)
      .values({
        accountId: coachAccount2.id,
        name: 'Priya Patel',
        bio: 'FIDE Master specializing in youth development',
        rating: 2200,
        specializations: ['Youth Training', 'Strategy', 'Tournament Prep'],
      })
      .returning();
    const coach2 = coach2Result[0];
    if (!coach2) throw new Error('Failed to create coach 2 profile');

    console.log(`   ✓ Coach 1: coach1@ica.com / Coach123!`);
    console.log(`   ✓ Coach 2: coach2@ica.com / Coach123!`);

    // Create batches
    console.log('📚 Creating batches...');
    const batch1Result = await db
      .insert(batches)
      .values({
        name: 'Beginner Batch A',
        coachId: coach1.id,
        level: 'Beginner',
        timezone: 'Asia/Kolkata',
        schedule: JSON.stringify({
          days: ['Monday', 'Wednesday', 'Friday'],
          time: '16:00',
          duration: 60,
        }),
        maxStudents: 8,
      })
      .returning();
    const batch1 = batch1Result[0];
    if (!batch1) throw new Error('Failed to create batch 1');

    const batch2Result = await db
      .insert(batches)
      .values({
        name: 'Intermediate Batch B',
        coachId: coach2.id,
        level: 'Intermediate',
        timezone: 'Asia/Kolkata',
        schedule: JSON.stringify({
          days: ['Tuesday', 'Thursday', 'Saturday'],
          time: '17:00',
          duration: 90,
        }),
        maxStudents: 6,
      })
      .returning();
    const batch2 = batch2Result[0];
    if (!batch2) throw new Error('Failed to create batch 2');

    console.log(`   ✓ Batch 1: Beginner Batch A`);
    console.log(`   ✓ Batch 2: Intermediate Batch B`);

    // Create customer accounts and students
    console.log('👨‍👩‍👧 Creating customer accounts and students...');
    const customerPassword = await hashPassword('Customer123!');

    for (let i = 1; i <= 5; i++) {
      const customerResult = await db
        .insert(accounts)
        .values({
          email: `parent${i}@example.com`,
          passwordHash: customerPassword,
          role: 'CUSTOMER',
        })
        .returning();
      const customer = customerResult[0];
      if (!customer) throw new Error(`Failed to create customer ${i}`);

      await db.insert(students).values({
        accountId: customer.id,
        studentName: `Student ${i}`,
        studentAge: 10 + i,
        parentName: `Parent ${i}`,
        parentEmail: `parent${i}@example.com`,
        timezone: 'Asia/Kolkata',
        country: 'India',
        studentType: i <= 3 ? 'GROUP' : '1-1',
        level: i <= 2 ? 'Beginner' : 'Intermediate',
        assignedCoachId: i <= 3 ? coach1.id : coach2.id,
        assignedBatchId: i <= 3 ? batch1.id : null,
        status: 'ACTIVE',
      });

      console.log(`   ✓ Customer ${i}: parent${i}@example.com / Customer123!`);
    }

    // Create demo records
    console.log('📅 Creating demo records...');
    const demoStatuses = [
      'BOOKED',
      'BOOKED',
      'ATTENDED',
      'INTERESTED',
      'PAYMENT_PENDING',
      'CONVERTED',
      'NO_SHOW',
      'RESCHEDULED',
      'NOT_INTERESTED',
      'DROPPED',
    ] as const;

    for (let i = 0; i < 10; i++) {
      const scheduledStart = new Date();
      scheduledStart.setDate(scheduledStart.getDate() + (i - 5)); // Some in past, some in future
      scheduledStart.setHours(10 + i, 0, 0, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + 45);

      await db.insert(demos).values({
        studentName: `Demo Student ${i + 1}`,
        parentName: `Demo Parent ${i + 1}`,
        parentEmail: `demo${i + 1}@example.com`,
        timezone: 'Asia/Kolkata',
        scheduledStart,
        scheduledEnd,
        coachId: i % 2 === 0 ? coach1.id : coach2.id,
        adminId: admin.id,
        status: demoStatuses[i],
        meetingLink: `https://meet.google.com/demo-${i + 1}`,
      });
    }
    console.log(`   ✓ Created 10 demo records`);

    // Create subscription plans
    console.log('💳 Creating subscription plans...');
    await db.insert(plans).values([
      {
        name: '1-1 Monthly',
        description: 'Individual coaching - 4 sessions per month',
        amount: '4999.00',
        currency: 'INR',
        billingCycle: 'monthly',
        studentType: '1-1',
        features: ['4 private sessions', 'Coach feedback', 'Game analysis'],
        isActive: true,
      },
      {
        name: '1-1 Quarterly',
        description: 'Individual coaching - 12 sessions',
        amount: '12999.00',
        currency: 'INR',
        billingCycle: 'quarterly',
        studentType: '1-1',
        features: ['12 private sessions', 'Priority scheduling', 'Tournament prep'],
        isActive: true,
      },
      {
        name: 'Group Monthly',
        description: 'Group batch - 12 sessions per month',
        amount: '2499.00',
        currency: 'INR',
        billingCycle: 'monthly',
        studentType: 'GROUP',
        features: ['12 group sessions', 'Batch community', 'Study materials'],
        isActive: true,
      },
      {
        name: 'Group Quarterly',
        description: 'Group batch - 36 sessions',
        amount: '6499.00',
        currency: 'INR',
        billingCycle: 'quarterly',
        studentType: 'GROUP',
        features: ['36 group sessions', 'Tournament entry', 'Progress reports'],
        isActive: true,
      },
    ]);
    console.log(`   ✓ Created 4 subscription plans`);

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Login credentials:');
    console.log('  Admin: admin@ica.com / Admin123!');
    console.log('  Coach: coach1@ica.com / Coach123!');
    console.log('  Customer: parent1@example.com / Customer123!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
