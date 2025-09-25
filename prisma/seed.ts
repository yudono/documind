import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting template seeding...');

  // Create dummy templates
  const templates = [
    {
      name: 'Business Proposal Template',
      description: 'Professional business proposal template with modern design and comprehensive sections for project overview, timeline, and budget.',
      type: 'pptx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Business+Proposal',
      isPublic: true,
      downloadCount: 245,
    },
    {
      name: 'Financial Report Template',
      description: 'Comprehensive Excel template for financial reporting with automated calculations, charts, and professional formatting.',
      type: 'xlsx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Financial+Report',
      isPublic: true,
      downloadCount: 189,
    },
    {
      name: 'Project Charter Document',
      description: 'Complete project charter template with sections for scope, objectives, stakeholders, and risk assessment.',
      type: 'docx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Project+Charter',
      isPublic: true,
      downloadCount: 156,
    },
    {
      name: 'Marketing Strategy Presentation',
      description: 'Dynamic PowerPoint template for marketing strategy presentations with infographics and data visualization slides.',
      type: 'pptx',
      category: 'marketing',
      thumbnail: 'https://via.placeholder.com/300x200/7C3AED/FFFFFF?text=Marketing+Strategy',
      isPublic: true,
      downloadCount: 312,
    },
    {
      name: 'Budget Planning Spreadsheet',
      description: 'Detailed Excel template for budget planning with categories, forecasting, and expense tracking capabilities.',
      type: 'xlsx',
      category: 'finance',
      thumbnail: 'https://via.placeholder.com/300x200/EA580C/FFFFFF?text=Budget+Planning',
      isPublic: true,
      downloadCount: 278,
    },
    {
      name: 'Meeting Minutes Template',
      description: 'Professional Word template for recording meeting minutes with action items, attendees, and follow-up sections.',
      type: 'docx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/0891B2/FFFFFF?text=Meeting+Minutes',
      isPublic: true,
      downloadCount: 134,
    },
    {
      name: 'Sales Dashboard Template',
      description: 'Interactive Excel dashboard for sales tracking with KPIs, charts, and performance metrics.',
      type: 'xlsx',
      category: 'sales',
      thumbnail: 'https://via.placeholder.com/300x200/BE185D/FFFFFF?text=Sales+Dashboard',
      isPublic: true,
      downloadCount: 201,
    },
    {
      name: 'Company Profile Presentation',
      description: 'Elegant PowerPoint template for company profiles with timeline, team, and service presentation slides.',
      type: 'pptx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Company+Profile',
      isPublic: true,
      downloadCount: 167,
    },
    {
      name: 'Invoice Template',
      description: 'Professional invoice template in Word format with automatic calculations and customizable branding.',
      type: 'docx',
      category: 'finance',
      thumbnail: 'https://via.placeholder.com/300x200/7C2D12/FFFFFF?text=Invoice+Template',
      isPublic: true,
      downloadCount: 423,
    },
    {
      name: 'Employee Handbook Template',
      description: 'Comprehensive employee handbook template covering policies, procedures, and company culture.',
      type: 'docx',
      category: 'hr',
      thumbnail: 'https://via.placeholder.com/300x200/1F2937/FFFFFF?text=Employee+Handbook',
      isPublic: true,
      downloadCount: 89,
    },
    {
      name: 'Inventory Management System',
      description: 'Excel-based inventory management system with stock tracking, alerts, and supplier information.',
      type: 'xlsx',
      category: 'operations',
      thumbnail: 'https://via.placeholder.com/300x200/374151/FFFFFF?text=Inventory+System',
      isPublic: true,
      downloadCount: 145,
    },
    {
      name: 'Training Presentation Template',
      description: 'Interactive PowerPoint template for training sessions with quiz slides and progress tracking.',
      type: 'pptx',
      category: 'education',
      thumbnail: 'https://via.placeholder.com/300x200/0F766E/FFFFFF?text=Training+Template',
      isPublic: true,
      downloadCount: 198,
    },
  ];

  for (const template of templates) {
    await prisma.template.create({
      data: {
        ...template,
        size: Math.floor(Math.random() * 5000000) + 100000, // Random size between 100KB and 5MB
      },
    });
  }

  console.log(`✅ Created ${templates.length} template records`);
  console.log('🎉 Template seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });