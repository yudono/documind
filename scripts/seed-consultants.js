const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedConsultants() {
  try {
    // First, get or create categories
    const categories = await prisma.consultantCategory.findMany();
    
    if (categories.length === 0) {
      console.log('No categories found. Please run the main seed first.');
      return;
    }

    // Create dummy users for consultants
    const consultantUsers = [
      {
        name: 'Dr. Sarah Wijaya',
        email: 'sarah.wijaya@example.com',
        image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face'
      },
      {
        name: 'Ahmad Rizki, S.H., M.H.',
        email: 'ahmad.rizki@example.com',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
      },
      {
        name: 'Siti Nurhaliza, CPA',
        email: 'siti.nurhaliza@example.com',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'
      },
      {
        name: 'Budi Santoso, S.E., M.M.',
        email: 'budi.santoso@example.com',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
      },
      {
        name: 'Maya Indira, S.H.',
        email: 'maya.indira@example.com',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
      },
      {
        name: 'Rudi Hermawan, CPA, CA',
        email: 'rudi.hermawan@example.com',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'
      }
    ];

    // Create users and consultants
    for (let i = 0; i < consultantUsers.length; i++) {
      const userData = consultantUsers[i];
      const categoryIndex = i % categories.length;
      const category = categories[categoryIndex];

      // Create user
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          name: userData.name,
          email: userData.email,
          image: userData.image,
          emailVerified: new Date()
        }
      });

      // Create consultant profile
      const consultantData = getConsultantData(userData.name, category.name, i);
      
      await prisma.consultant.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          fullName: userData.name,
          title: consultantData.title,
          bio: consultantData.bio,
          profileImage: userData.image,
          experience: consultantData.experience,
          education: consultantData.education,
          certifications: consultantData.certifications,
          languages: ['Indonesian', 'English'],
          categoryId: category.id,
          specializations: consultantData.specializations,
          licenseNumber: consultantData.licenseNumber,
          hourlyRate: consultantData.hourlyRate,
          currency: 'IDR',
          responseTime: consultantData.responseTime,
          consultationTypes: ['video_call', 'phone_call', 'chat'],
          isVerified: true,
          verificationDate: new Date(),
          status: 'approved',
          totalBookings: Math.floor(Math.random() * 100) + 20,
          completedBookings: Math.floor(Math.random() * 80) + 15,
          averageRating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 - 5.0
          totalReviews: Math.floor(Math.random() * 50) + 10
        }
      });

      console.log(`Created consultant: ${userData.name} in category: ${category.name}`);
    }

    console.log('✅ Consultant seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding consultants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getConsultantData(name, categoryName, index) {
  const baseData = {
    'Lawyer': {
      titles: ['Senior Legal Counsel', 'Corporate Lawyer', 'Litigation Specialist', 'Legal Advisor'],
      specializations: [
        ['Corporate Law', 'Contract Law', 'Mergers & Acquisitions'],
        ['Civil Litigation', 'Criminal Defense', 'Family Law'],
        ['Intellectual Property', 'Technology Law', 'Startup Legal'],
        ['Employment Law', 'Labor Relations', 'HR Compliance']
      ],
      bios: [
        'Experienced corporate lawyer with over 10 years of expertise in business law, contract negotiations, and regulatory compliance. Specialized in helping startups and SMEs navigate complex legal landscapes.',
        'Dedicated litigation specialist with a proven track record in civil and criminal cases. Known for thorough case preparation and strong courtroom advocacy.',
        'Technology-focused legal expert helping businesses with IP protection, software licensing, and digital transformation legal requirements.',
        'Employment law specialist with extensive experience in labor relations, workplace policies, and HR legal compliance.'
      ],
      hourlyRates: [750000, 850000, 950000, 1200000],
      responseTimes: ['Within 2 hours', 'Same day', 'Within 4 hours', 'Within 1 hour']
    },
    'Legal Advisor': {
      titles: ['Legal Consultant', 'Compliance Advisor', 'Regulatory Specialist', 'Legal Analyst'],
      specializations: [
        ['Business Compliance', 'Regulatory Affairs', 'Risk Management'],
        ['Contract Review', 'Legal Documentation', 'Due Diligence'],
        ['Corporate Governance', 'Policy Development', 'Legal Research'],
        ['International Law', 'Cross-border Transactions', 'Trade Compliance']
      ],
      bios: [
        'Strategic legal advisor specializing in business compliance and regulatory affairs. Helps companies maintain legal compliance while achieving business objectives.',
        'Detail-oriented legal consultant with expertise in contract analysis and legal documentation. Ensures all business agreements are legally sound.',
        'Corporate governance specialist helping organizations develop robust policies and maintain regulatory compliance across multiple jurisdictions.',
        'International law expert with experience in cross-border transactions and global trade compliance requirements.'
      ],
      hourlyRates: [650000, 750000, 850000, 950000],
      responseTimes: ['Same day', 'Within 4 hours', 'Within 2 hours', 'Within 6 hours']
    },
    'Tax & Accounting Consultant': {
      titles: ['Senior Tax Consultant', 'Accounting Specialist', 'Financial Advisor', 'Tax Planning Expert'],
      specializations: [
        ['Corporate Tax', 'Tax Planning', 'Tax Compliance'],
        ['Financial Reporting', 'Audit Support', 'Bookkeeping'],
        ['Investment Advisory', 'Financial Planning', 'Wealth Management'],
        ['International Tax', 'Transfer Pricing', 'Tax Optimization']
      ],
      bios: [
        'Certified tax consultant with extensive experience in corporate taxation and tax planning strategies. Helps businesses optimize their tax positions legally.',
        'Professional accountant specializing in financial reporting and audit support. Ensures accurate financial records and regulatory compliance.',
        'Financial planning expert helping individuals and businesses achieve their financial goals through strategic planning and investment advice.',
        'International tax specialist with expertise in cross-border taxation and transfer pricing for multinational corporations.'
      ],
      hourlyRates: [600000, 700000, 800000, 1000000],
      responseTimes: ['Within 4 hours', 'Same day', 'Within 2 hours', 'Within 6 hours']
    },
    'Business Licensing Expert': {
      titles: ['Licensing Specialist', 'Permit Consultant', 'Regulatory Affairs Expert', 'Business Setup Advisor'],
      specializations: [
        ['Business Registration', 'Company Formation', 'Permit Applications'],
        ['Industry Licensing', 'Regulatory Permits', 'Compliance Certification'],
        ['Foreign Investment', 'International Business Setup', 'Joint Ventures'],
        ['Franchise Licensing', 'Intellectual Property Registration', 'Brand Protection']
      ],
      bios: [
        'Business licensing expert with deep knowledge of Indonesian regulatory requirements. Streamlines the business setup process for local and foreign investors.',
        'Regulatory affairs specialist helping businesses obtain necessary permits and maintain compliance with industry regulations.',
        'International business consultant specializing in foreign investment procedures and cross-border business establishment.',
        'Franchise and IP licensing expert helping businesses protect their intellectual property and expand through licensing agreements.'
      ],
      hourlyRates: [550000, 650000, 750000, 900000],
      responseTimes: ['Same day', 'Within 6 hours', 'Within 4 hours', 'Within 2 hours']
    }
  };

  const categoryData = baseData[categoryName] || baseData['Legal Advisor'];
  const dataIndex = index % categoryData.titles.length;

  return {
    title: categoryData.titles[dataIndex],
    bio: categoryData.bios[dataIndex],
    specializations: categoryData.specializations[dataIndex],
    hourlyRate: categoryData.hourlyRates[dataIndex],
    responseTime: categoryData.responseTimes[dataIndex],
    experience: Math.floor(Math.random() * 15) + 3, // 3-18 years
    education: getEducation(categoryName),
    certifications: getCertifications(categoryName),
    licenseNumber: `LIC-${categoryName.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  };
}

function getEducation(categoryName) {
  const educations = {
    'Lawyer': 'S.H. Universitas Indonesia, M.H. Universitas Gadjah Mada',
    'Legal Advisor': 'S.H. Universitas Padjadjaran, M.H. Universitas Airlangga',
    'Tax & Accounting Consultant': 'S.E. Universitas Indonesia, M.Ak. Universitas Gadjah Mada, CPA',
    'Business Licensing Expert': 'S.E. Universitas Brawijaya, M.M. Institut Teknologi Bandung'
  };
  return educations[categoryName] || educations['Legal Advisor'];
}

function getCertifications(categoryName) {
  const certifications = {
    'Lawyer': ['Indonesian Bar Association', 'Corporate Law Certification', 'Litigation Specialist'],
    'Legal Advisor': ['Legal Consultant License', 'Compliance Certification', 'Risk Management Certificate'],
    'Tax & Accounting Consultant': ['Certified Public Accountant (CPA)', 'Tax Consultant License', 'Financial Planning Certificate'],
    'Business Licensing Expert': ['Business Consultant License', 'Regulatory Affairs Certification', 'Investment Advisory License']
  };
  return certifications[categoryName] || certifications['Legal Advisor'];
}

seedConsultants();