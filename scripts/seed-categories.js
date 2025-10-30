const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCategories() {
  try {
    console.log('📋 Seeding consultant categories...');
    const categories = [
      {
        name: 'Lawyer',
        description: 'Qualified legal professionals specializing in various areas of law',
        icon: 'Scale',
        color: '#DC2626',
        sortOrder: 1
      },
      {
        name: 'Legal Advisor',
        description: 'Legal consultants providing advice on legal matters and compliance',
        icon: 'FileText',
        color: '#2563EB',
        sortOrder: 2
      },
      {
        name: 'Tax & Accounting Consultant',
        description: 'Certified professionals for tax planning, accounting, and financial advice',
        icon: 'Calculator',
        color: '#059669',
        sortOrder: 3
      },
      {
        name: 'Business Licensing Expert',
        description: 'Specialists in business permits, licensing, and regulatory compliance',
        icon: 'Award',
        color: '#7C3AED',
        sortOrder: 4
      }
    ];

    for (const category of categories) {
      await prisma.consultantCategory.upsert({
        where: { name: category.name },
        update: category,
        create: category,
      });
      console.log(`Created category: ${category.name}`);
    }

    console.log('✅ Consultant categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding consultant categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();