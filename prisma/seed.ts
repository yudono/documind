import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');
  
  // Seed Consultant Categories
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
  }

  console.log('🌱 Starting template seeding...');

  // Create simplified templates for current database structure
  const templates = [
    {
      name: 'Business Proposal Template',
      thumbnail: 'https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=Business+Proposal',
      html: '<h1>Business Proposal Template</h1><p>Professional business proposal template for creating compelling project proposals.</p>'
    },
    {
      name: 'Invoice Template',
      thumbnail: 'https://via.placeholder.com/300x200/7C2D12/FFFFFF?text=Invoice+Template',
      html: '<h1>Invoice Template</h1><p>Professional invoice template with automatic calculations and customizable business details.</p>'
    },
    {
      name: 'Contract Agreement Template',
      thumbnail: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Contract+Template',
      html: '<h1>Contract Agreement Template</h1><p>Legal contract template for service agreements with customizable terms and conditions.</p>'
    },
    {
      name: 'Employee Offer Letter',
      thumbnail: 'https://via.placeholder.com/300x200/1F2937/FFFFFF?text=Offer+Letter',
      html: '<h1>Employee Offer Letter</h1><p>Professional job offer letter template with salary, benefits, and terms details.</p>'
    },
    {
      name: 'Meeting Minutes Template',
      thumbnail: 'https://via.placeholder.com/300x200/0891B2/FFFFFF?text=Meeting+Minutes',
      html: '<h1>Meeting Minutes Template</h1><p>Professional meeting minutes template with action items and attendee tracking.</p>'
    },
    {
      name: 'Project Status Report',
      thumbnail: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Status+Report',
      html: '<h1>Project Status Report</h1><p>Comprehensive project status report template with progress tracking and risk assessment.</p>'
    }
  ];

  for (const template of templates) {
    await prisma.template.create({
      data: template,
    });
  }

  console.log(`✅ Created ${templates.length} template records`);
  console.log('✅ Templates seeded successfully!');

  // Seed Consultant Users and Consultants
  console.log('👨‍💼 Seeding consultant users and consultants...');
  
  // First, get the categories we created
  const lawyerCategory = await (prisma as any).consultantCategory.findFirst({
    where: { name: 'Lawyer' }
  });
  const legalAdvisorCategory = await (prisma as any).consultantCategory.findFirst({
    where: { name: 'Legal Advisor' }
  });
  const taxCategory = await (prisma as any).consultantCategory.findFirst({
    where: { name: 'Tax & Accounting Consultant' }
  });
  const businessCategory = await (prisma as any).consultantCategory.findFirst({
    where: { name: 'Business Licensing Expert' }
  });

  // Create consultant users and their consultant profiles
  const consultantData = [
    {
      user: {
        email: 'ahmad.lawyer@example.com',
        name: 'Ahmad Santoso, S.H., M.H.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      },
      consultant: {
        fullName: 'Ahmad Santoso, S.H., M.H.',
        title: 'Senior Legal Advisor & Corporate Lawyer',
        bio: 'Pengacara berpengalaman 15 tahun dalam hukum korporat, kontrak bisnis, dan penyelesaian sengketa. Alumni Fakultas Hukum Universitas Indonesia dengan spesialisasi hukum bisnis dan investasi.',
        experience: 15,
        education: 'S.H. Universitas Indonesia, M.H. Hukum Bisnis Universitas Gadjah Mada',
        certifications: ['Advokat Indonesia', 'Certified Corporate Lawyer', 'Mediator Bersertifikat'],
        languages: ['Bahasa Indonesia', 'English', 'Mandarin'],
        categoryId: lawyerCategory?.id,
        specializations: ['Hukum Korporat', 'Kontrak Bisnis', 'Merger & Akuisisi', 'Penyelesaian Sengketa'],
        licenseNumber: 'ADV-001-2008',
        hourlyRate: 750000,
        currency: 'IDR',
        availability: {
          monday: ['09:00-12:00', '14:00-17:00'],
          tuesday: ['09:00-12:00', '14:00-17:00'],
          wednesday: ['09:00-12:00', '14:00-17:00'],
          thursday: ['09:00-12:00', '14:00-17:00'],
          friday: ['09:00-12:00', '14:00-16:00']
        },
        responseTime: 'Dalam 2 jam',
        consultationTypes: ['video_call', 'phone_call', 'in_person'],
        isVerified: true,
        verificationDate: new Date(),
        status: 'approved',
        averageRating: 4.8,
        totalReviews: 127,
        totalBookings: 156,
        completedBookings: 142
      }
    },
    {
      user: {
        email: 'sari.tax@example.com',
        name: 'Sari Wijaya, S.E., M.Ak., CPA',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
      },
      consultant: {
        fullName: 'Sari Wijaya, S.E., M.Ak., CPA',
        title: 'Senior Tax & Accounting Consultant',
        bio: 'Konsultan pajak dan akuntansi bersertifikat dengan pengalaman 12 tahun. Spesialis dalam perencanaan pajak perusahaan, audit, dan compliance perpajakan untuk UMKM hingga perusahaan multinasional.',
        experience: 12,
        education: 'S.E. Universitas Brawijaya, M.Ak. Universitas Indonesia, CPA Australia',
        certifications: ['Certified Public Accountant (CPA)', 'Brevet A&B Konsultan Pajak', 'Certified Internal Auditor'],
        languages: ['Bahasa Indonesia', 'English'],
        categoryId: taxCategory?.id,
        specializations: ['Perencanaan Pajak', 'Audit Internal', 'Compliance Perpajakan', 'Akuntansi Manajemen'],
        licenseNumber: 'CPA-2011-0456',
        hourlyRate: 650000,
        currency: 'IDR',
        availability: {
          monday: ['08:00-12:00', '13:00-17:00'],
          tuesday: ['08:00-12:00', '13:00-17:00'],
          wednesday: ['08:00-12:00', '13:00-17:00'],
          thursday: ['08:00-12:00', '13:00-17:00'],
          friday: ['08:00-12:00', '13:00-16:00']
        },
        responseTime: 'Dalam 1 jam',
        consultationTypes: ['video_call', 'phone_call', 'chat'],
        isVerified: true,
        verificationDate: new Date(),
        status: 'approved',
        averageRating: 4.9,
        totalReviews: 89,
        totalBookings: 103,
        completedBookings: 98
      }
    },
    {
      user: {
        email: 'budi.business@example.com',
        name: 'Budi Hartono, S.H., M.M.',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      },
      consultant: {
        fullName: 'Budi Hartono, S.H., M.M.',
        title: 'Business Licensing & Regulatory Expert',
        bio: 'Ahli perizinan usaha dan regulasi bisnis dengan pengalaman 10 tahun. Membantu startup hingga perusahaan besar dalam mengurus izin usaha, SIUP, NIB, dan compliance regulasi pemerintah.',
        experience: 10,
        education: 'S.H. Universitas Padjadjaran, M.M. Institut Teknologi Bandung',
        certifications: ['Certified Business Consultant', 'Licensed Business Advisor', 'Regulatory Compliance Specialist'],
        languages: ['Bahasa Indonesia', 'English'],
        categoryId: businessCategory?.id,
        specializations: ['Perizinan Usaha', 'NIB & OSS', 'Compliance Regulasi', 'Startup Legal Setup'],
        licenseNumber: 'BLC-2013-0789',
        hourlyRate: 500000,
        currency: 'IDR',
        availability: {
          monday: ['09:00-12:00', '14:00-18:00'],
          tuesday: ['09:00-12:00', '14:00-18:00'],
          wednesday: ['09:00-12:00', '14:00-18:00'],
          thursday: ['09:00-12:00', '14:00-18:00'],
          friday: ['09:00-12:00', '14:00-17:00'],
          saturday: ['09:00-12:00']
        },
        responseTime: 'Dalam 3 jam',
        consultationTypes: ['video_call', 'phone_call', 'chat', 'in_person'],
        isVerified: true,
        verificationDate: new Date(),
        status: 'approved',
        averageRating: 4.7,
        totalReviews: 64,
        totalBookings: 78,
        completedBookings: 71
      }
    },
    {
      user: {
        email: 'maya.legal@example.com',
        name: 'Maya Putri, S.H.',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
      },
      consultant: {
        fullName: 'Maya Putri, S.H.',
        title: 'Legal Advisor & Contract Specialist',
        bio: 'Penasihat hukum muda dan dinamis dengan fokus pada hukum kontrak, intellectual property, dan hukum teknologi. Berpengalaman menangani legal startup teknologi dan e-commerce.',
        experience: 7,
        education: 'S.H. Universitas Indonesia, Sertifikat Hukum Teknologi Stanford University',
        certifications: ['Advokat Indonesia', 'Certified IP Lawyer', 'Tech Law Specialist'],
        languages: ['Bahasa Indonesia', 'English', 'Japanese'],
        categoryId: legalAdvisorCategory?.id,
        specializations: ['Hukum Kontrak', 'Intellectual Property', 'Hukum Teknologi', 'E-commerce Law'],
        licenseNumber: 'ADV-2016-1234',
        hourlyRate: 450000,
        currency: 'IDR',
        availability: {
          monday: ['10:00-13:00', '15:00-18:00'],
          tuesday: ['10:00-13:00', '15:00-18:00'],
          wednesday: ['10:00-13:00', '15:00-18:00'],
          thursday: ['10:00-13:00', '15:00-18:00'],
          friday: ['10:00-13:00', '15:00-17:00']
        },
        responseTime: 'Dalam 1 jam',
        consultationTypes: ['video_call', 'chat'],
        isVerified: true,
        verificationDate: new Date(),
        status: 'approved',
        averageRating: 4.6,
        totalReviews: 42,
        totalBookings: 56,
        completedBookings: 51
      }
    },
    {
      user: {
        email: 'andi.senior@example.com',
        name: 'Andi Wijaya, S.H., M.H.',
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
      },
      consultant: {
        fullName: 'Andi Wijaya, S.H., M.H.',
        title: 'Senior Corporate Lawyer & Legal Strategist',
        bio: 'Pengacara senior dengan pengalaman 20 tahun dalam hukum korporat, merger & akuisisi, dan restructuring perusahaan. Mantan partner di firma hukum internasional.',
        experience: 20,
        education: 'S.H. Universitas Gadjah Mada, M.H. Harvard Law School, LL.M. Corporate Law',
        certifications: ['Advokat Indonesia', 'New York Bar Association', 'Certified M&A Advisor'],
        languages: ['Bahasa Indonesia', 'English', 'Mandarin'],
        categoryId: lawyerCategory?.id,
        specializations: ['Corporate Law', 'Merger & Acquisition', 'Corporate Restructuring', 'International Business Law'],
        licenseNumber: 'ADV-2003-0001',
        hourlyRate: 1200000,
        currency: 'IDR',
        availability: {
          monday: ['09:00-12:00', '14:00-17:00'],
          tuesday: ['09:00-12:00', '14:00-17:00'],
          wednesday: ['09:00-12:00', '14:00-17:00'],
          thursday: ['09:00-12:00', '14:00-17:00'],
          friday: ['09:00-12:00']
        },
        responseTime: 'Dalam 4 jam',
        consultationTypes: ['video_call', 'phone_call', 'in_person'],
        isVerified: true,
        verificationDate: new Date(),
        status: 'approved',
        averageRating: 4.9,
        totalReviews: 203,
        totalBookings: 234,
        completedBookings: 228
      }
    }
  ];

  // Create users and consultants
  for (const data of consultantData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.user.email }
    });

    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      user = await prisma.user.create({
        data: {
          ...data.user,
          emailVerified: new Date(),
        }
      });
    }

    // Check if consultant already exists
    const existingConsultant = await (prisma as any).consultant.findUnique({
      where: { userId: user.id }
    });

    if (!existingConsultant) {
      await (prisma as any).consultant.create({
        data: {
          ...data.consultant,
          userId: user.id,
        }
      });
    }
  }

  console.log('✅ Consultants seeded successfully!');

  // Create credit packages
  console.log('🌱 Starting credit packages seeding...');
  
  const creditPackages = [
    {
      name: 'Pro Pack',
      description: 'Professional package for regular users',
      credits: 1500,
      price: 99000,
      currency: 'IDR',
      isActive: true,
    },
    {
      name: 'Enterprise Pack',
      description: 'Enterprise package for organizations',
      credits: 5000,
      price: 499000,
      currency: 'IDR',
      isActive: true,
    },
  ];

  for (const pkg of creditPackages) {
    const existingPackage = await prisma.creditPackage.findFirst({
      where: { name: pkg.name },
    });
    
    if (existingPackage) {
      await prisma.creditPackage.update({
        where: { id: existingPackage.id },
        data: pkg,
      });
    } else {
      await prisma.creditPackage.create({
        data: pkg,
      });
    }
  }

  console.log('✅ Credit packages seeded successfully!');

  // Create subscription plans
  console.log('🌱 Starting subscription plans seeding...');
  
  const subscriptionPlans = [
    {
      name: 'Free Plan',
      description: 'Essential features for individual users',
      price: 0,
      currency: 'IDR',
      dailyCredits: 3, // ~100 per month
      monthlyCredits: 100,
      features: ['100 monthly credits', 'Basic AI analysis', 'Standard templates', 'Email support'],
      isActive: true,
    },
    {
      name: 'Pro Plan',
      description: 'Advanced features for professionals',
      price: 99000,
      currency: 'IDR',
      dailyCredits: 50, // ~1500 per month
      monthlyCredits: 1500,
      features: ['1500 monthly credits', 'Advanced AI analysis', 'Premium templates', 'AI Chat Assistant', 'Priority support'],
      isActive: true,
    },
    {
      name: 'Enterprise Plan',
      description: 'Full features for teams and organizations',
      price: 499000,
      currency: 'IDR',
      dailyCredits: 167, // ~5000 per month
      monthlyCredits: 5000,
      features: ['5000 monthly credits', 'Custom AI models', 'Custom templates', 'API access', '24/7 dedicated support'],
      isActive: true,
    },
  ];

  for (const plan of subscriptionPlans) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: plan.name },
    });
    
    if (existingPlan) {
      await prisma.subscriptionPlan.update({
        where: { id: existingPlan.id },
        data: plan,
      });
    } else {
      await prisma.subscriptionPlan.create({
        data: plan,
      });
    }
  }

  console.log('✅ Subscription plans seeded successfully!');
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });