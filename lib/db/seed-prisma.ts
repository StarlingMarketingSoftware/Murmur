import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = 'admin123'; // Change this in production
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create demo user
  const demoPassword = 'demo123'; // Change this in production
  const demoPasswordHash = await bcrypt.hash(demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      passwordHash: demoPasswordHash,
      role: 'member',
    },
  });

  console.log(`Created demo user: ${demoUser.email}`);

  // Create a team
  const team = await prisma.team.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Demo Team',
      planName: 'Free',
      subscriptionStatus: 'active',
    },
  });

  console.log(`Created team: ${team.name}`);

  // Add users to team
  const adminTeamMember = await prisma.teamMember.upsert({
    where: {
      id: 1,
    },
    update: {},
    create: {
      userId: admin.id,
      teamId: team.id,
      role: 'admin',
    },
  });

  const demoTeamMember = await prisma.teamMember.upsert({
    where: {
      id: 2,
    },
    update: {},
    create: {
      userId: demoUser.id,
      teamId: team.id,
      role: 'member',
    },
  });

  console.log(`Added users to team: ${team.name}`);

  // Create activity logs
  await prisma.activityLog.createMany({
    data: [
      {
        teamId: team.id,
        userId: admin.id,
        action: 'SIGN_UP',
        ipAddress: '127.0.0.1',
      },
      {
        teamId: team.id,
        userId: demoUser.id,
        action: 'SIGN_UP',
        ipAddress: '127.0.0.1',
      },
      {
        teamId: team.id,
        userId: admin.id,
        action: 'CREATE_TEAM',
        ipAddress: '127.0.0.1',
      },
      {
        teamId: team.id,
        userId: admin.id,
        action: 'INVITE_TEAM_MEMBER',
        ipAddress: '127.0.0.1',
      },
      {
        teamId: team.id,
        userId: demoUser.id,
        action: 'ACCEPT_INVITATION',
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('Created activity logs');

  console.log('Database seeding completed!');
  console.log('\nDemo credentials:');
  console.log('Admin: admin@example.com / admin123');
  console.log('User: demo@example.com / demo123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 