#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function promoteUserToAdmin(email) {
  try {
    console.log(`Promoting user ${email} to admin...`);
    
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' }
    });

    console.log(`✅ Successfully promoted ${email} to admin role`);
    console.log(`User ID: ${updatedUser.id}`);
    console.log(`Name: ${updatedUser.name || 'N/A'}`);
    console.log(`Role: ${updatedUser.role}`);
    
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function listUsers() {
  try {
    console.log('Current users in the system:');
    console.log('================================');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (users.length === 0) {
      console.log('No users found in the system');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role || 'user'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node promote-admin.js <email>     - Promote user to admin');
  console.log('  node promote-admin.js --list      - List all users');
  console.log('');
  console.log('Examples:');
  console.log('  node promote-admin.js user@example.com');
  console.log('  node promote-admin.js --list');
  process.exit(1);
}

if (args[0] === '--list') {
  listUsers();
} else {
  const email = args[0];
  if (!email.includes('@')) {
    console.error('Please provide a valid email address');
    process.exit(1);
  }
  promoteUserToAdmin(email);
}