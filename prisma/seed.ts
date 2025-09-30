import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting template seeding...');

  // Create dummy templates with form fields and original files
  const templates = [
    {
      name: 'Business Proposal Template',
      description: 'Professional business proposal template with modern design and comprehensive sections for project overview, timeline, and budget.',
      type: 'docx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Business+Proposal',
      isPublic: true,
      downloadCount: 245,
      url: 'https://example-bucket.s3.amazonaws.com/templates/business-proposal-template.docx',
      key: 'templates/business-proposal-template.docx',
      bucket: 'example-bucket',
      previewUrl: 'https://via.placeholder.com/600x800/4F46E5/FFFFFF?text=Business+Proposal+Preview',
      instructions: 'Fill in your company details, project information, and budget to create a professional business proposal.',
      templateFields: {
        fields: [
          { name: 'companyName', label: 'Company Name', type: 'text', placeholder: 'Enter your company name', required: true },
          { name: 'clientName', label: 'Client Name', type: 'text', placeholder: 'Enter client name', required: true },
          { name: 'projectTitle', label: 'Project Title', type: 'text', placeholder: 'Enter project title', required: true },
          { name: 'projectDescription', label: 'Project Description', type: 'textarea', placeholder: 'Describe the project in detail', required: true },
          { name: 'budget', label: 'Budget', type: 'number', placeholder: 'Enter budget amount', required: true },
          { name: 'timeline', label: 'Timeline (weeks)', type: 'number', placeholder: 'Enter project duration', required: true },
          { name: 'contactEmail', label: 'Contact Email', type: 'email', placeholder: 'Enter contact email', required: true },
          { name: 'date', label: 'Proposal Date', type: 'date', required: true }
        ],
        placeholders: {
          '{{companyName}}': 'companyName',
          '{{clientName}}': 'clientName',
          '{{projectTitle}}': 'projectTitle',
          '{{projectDescription}}': 'projectDescription',
          '{{budget}}': 'budget',
          '{{timeline}}': 'timeline',
          '{{contactEmail}}': 'contactEmail',
          '{{date}}': 'date'
        }
      }
    },
    {
      name: 'Invoice Template',
      description: 'Professional invoice template with automatic calculations and customizable branding.',
      type: 'docx',
      category: 'finance',
      thumbnail: 'https://via.placeholder.com/300x200/7C2D12/FFFFFF?text=Invoice+Template',
      isPublic: true,
      downloadCount: 423,
      url: 'https://example-bucket.s3.amazonaws.com/templates/invoice-template.docx',
      key: 'templates/invoice-template.docx',
      bucket: 'example-bucket',
      previewUrl: 'https://via.placeholder.com/600x800/7C2D12/FFFFFF?text=Invoice+Preview',
      instructions: 'Enter your business details and invoice items to generate a professional invoice.',
      templateFields: {
        fields: [
          { name: 'businessName', label: 'Business Name', type: 'text', placeholder: 'Enter your business name', required: true },
          { name: 'businessAddress', label: 'Business Address', type: 'textarea', placeholder: 'Enter your business address', required: true },
          { name: 'clientName', label: 'Client Name', type: 'text', placeholder: 'Enter client name', required: true },
          { name: 'clientAddress', label: 'Client Address', type: 'textarea', placeholder: 'Enter client address', required: true },
          { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', placeholder: 'Enter invoice number', required: true },
          { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
          { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
          { name: 'itemDescription', label: 'Item Description', type: 'text', placeholder: 'Describe the service/product', required: true },
          { name: 'quantity', label: 'Quantity', type: 'number', placeholder: 'Enter quantity', required: true },
          { name: 'unitPrice', label: 'Unit Price', type: 'number', placeholder: 'Enter unit price', required: true },
          { name: 'taxRate', label: 'Tax Rate (%)', type: 'number', placeholder: 'Enter tax rate', required: false }
        ],
        placeholders: {
          '{{businessName}}': 'businessName',
          '{{businessAddress}}': 'businessAddress',
          '{{clientName}}': 'clientName',
          '{{clientAddress}}': 'clientAddress',
          '{{invoiceNumber}}': 'invoiceNumber',
          '{{invoiceDate}}': 'invoiceDate',
          '{{dueDate}}': 'dueDate',
          '{{itemDescription}}': 'itemDescription',
          '{{quantity}}': 'quantity',
          '{{unitPrice}}': 'unitPrice',
          '{{taxRate}}': 'taxRate',
          '{{totalAmount}}': 'calculated'
        }
      }
    },
    {
      name: 'Contract Agreement Template',
      description: 'Legal contract template for service agreements with customizable terms and conditions.',
      type: 'docx',
      category: 'legal',
      thumbnail: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Contract+Template',
      isPublic: true,
      downloadCount: 189,
      url: 'https://example-bucket.s3.amazonaws.com/templates/contract-template.docx',
      key: 'templates/contract-template.docx',
      bucket: 'example-bucket',
      previewUrl: 'https://via.placeholder.com/600x800/059669/FFFFFF?text=Contract+Preview',
      instructions: 'Fill in the contract details to create a legally binding service agreement.',
      templateFields: {
        fields: [
          { name: 'partyAName', label: 'Party A Name', type: 'text', placeholder: 'Enter first party name', required: true },
          { name: 'partyBName', label: 'Party B Name', type: 'text', placeholder: 'Enter second party name', required: true },
          { name: 'serviceDescription', label: 'Service Description', type: 'textarea', placeholder: 'Describe the services to be provided', required: true },
          { name: 'contractValue', label: 'Contract Value', type: 'number', placeholder: 'Enter contract value', required: true },
          { name: 'startDate', label: 'Start Date', type: 'date', required: true },
          { name: 'endDate', label: 'End Date', type: 'date', required: true },
          { name: 'paymentTerms', label: 'Payment Terms', type: 'select', options: ['Net 30', 'Net 15', 'Upon completion', 'Monthly'], required: true },
          { name: 'jurisdiction', label: 'Jurisdiction', type: 'text', placeholder: 'Enter governing jurisdiction', required: true }
        ],
        placeholders: {
          '{{partyAName}}': 'partyAName',
          '{{partyBName}}': 'partyBName',
          '{{serviceDescription}}': 'serviceDescription',
          '{{contractValue}}': 'contractValue',
          '{{startDate}}': 'startDate',
          '{{endDate}}': 'endDate',
          '{{paymentTerms}}': 'paymentTerms',
          '{{jurisdiction}}': 'jurisdiction'
        }
      }
    },
    {
      name: 'Employee Offer Letter',
      description: 'Professional job offer letter template with salary, benefits, and terms details.',
      type: 'docx',
      category: 'hr',
      thumbnail: 'https://via.placeholder.com/300x200/1F2937/FFFFFF?text=Offer+Letter',
      isPublic: true,
      downloadCount: 156,
      url: 'https://example-bucket.s3.amazonaws.com/templates/offer-letter-template.docx',
      key: 'templates/offer-letter-template.docx',
      bucket: 'example-bucket',
      previewUrl: 'https://via.placeholder.com/600x800/1F2937/FFFFFF?text=Offer+Letter+Preview',
      instructions: 'Enter employee and position details to generate a professional job offer letter.',
      templateFields: {
        fields: [
          { name: 'candidateName', label: 'Candidate Name', type: 'text', placeholder: 'Enter candidate full name', required: true },
          { name: 'position', label: 'Position Title', type: 'text', placeholder: 'Enter job position', required: true },
          { name: 'department', label: 'Department', type: 'text', placeholder: 'Enter department', required: true },
          { name: 'salary', label: 'Annual Salary', type: 'number', placeholder: 'Enter annual salary', required: true },
          { name: 'startDate', label: 'Start Date', type: 'date', required: true },
          { name: 'reportingManager', label: 'Reporting Manager', type: 'text', placeholder: 'Enter manager name', required: true },
          { name: 'workLocation', label: 'Work Location', type: 'text', placeholder: 'Enter work location', required: true },
          { name: 'benefits', label: 'Benefits Package', type: 'textarea', placeholder: 'Describe benefits package', required: false }
        ],
        placeholders: {
          '{{candidateName}}': 'candidateName',
          '{{position}}': 'position',
          '{{department}}': 'department',
          '{{salary}}': 'salary',
          '{{startDate}}': 'startDate',
          '{{reportingManager}}': 'reportingManager',
          '{{workLocation}}': 'workLocation',
          '{{benefits}}': 'benefits'
        }
      }
    },
    {
      name: 'Meeting Minutes Template',
      description: 'Professional meeting minutes template with action items and attendee tracking.',
      type: 'docx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/0891B2/FFFFFF?text=Meeting+Minutes',
      isPublic: true,
      downloadCount: 134,
      url: 'https://example-bucket.s3.amazonaws.com/templates/meeting-minutes-template.docx',
      key: 'templates/meeting-minutes-template.docx',
      bucket: 'example-bucket',
      previewUrl: 'https://via.placeholder.com/600x800/0891B2/FFFFFF?text=Meeting+Minutes+Preview',
      instructions: 'Record meeting details and action items to create professional meeting minutes.',
      templateFields: {
        fields: [
          { name: 'meetingTitle', label: 'Meeting Title', type: 'text', placeholder: 'Enter meeting title', required: true },
          { name: 'meetingDate', label: 'Meeting Date', type: 'date', required: true },
          { name: 'meetingTime', label: 'Meeting Time', type: 'time', required: true },
          { name: 'location', label: 'Location', type: 'text', placeholder: 'Enter meeting location', required: true },
          { name: 'chairperson', label: 'Chairperson', type: 'text', placeholder: 'Enter chairperson name', required: true },
          { name: 'attendees', label: 'Attendees', type: 'textarea', placeholder: 'List all attendees', required: true },
          { name: 'agenda', label: 'Agenda Items', type: 'textarea', placeholder: 'List agenda items', required: true },
          { name: 'decisions', label: 'Key Decisions', type: 'textarea', placeholder: 'Record key decisions made', required: false },
          { name: 'actionItems', label: 'Action Items', type: 'textarea', placeholder: 'List action items and owners', required: false }
        ],
        placeholders: {
          '{{meetingTitle}}': 'meetingTitle',
          '{{meetingDate}}': 'meetingDate',
          '{{meetingTime}}': 'meetingTime',
          '{{location}}': 'location',
          '{{chairperson}}': 'chairperson',
          '{{attendees}}': 'attendees',
          '{{agenda}}': 'agenda',
          '{{decisions}}': 'decisions',
          '{{actionItems}}': 'actionItems'
        }
      }
    },
    {
      name: 'Project Status Report',
      description: 'Comprehensive project status report template with progress tracking and risk assessment.',
      type: 'docx',
      category: 'business',
      thumbnail: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Status+Report',
      isPublic: true,
      downloadCount: 198,
      url: 'https://example-bucket.s3.amazonaws.com/templates/status-report-template.docx',
      key: 'templates/status-report-template.docx',
      bucket: 'example-bucket',
      previewUrl: 'https://via.placeholder.com/600x800/DC2626/FFFFFF?text=Status+Report+Preview',
      instructions: 'Update project progress and status information to generate a comprehensive status report.',
      templateFields: {
        fields: [
          { name: 'projectName', label: 'Project Name', type: 'text', placeholder: 'Enter project name', required: true },
          { name: 'reportDate', label: 'Report Date', type: 'date', required: true },
          { name: 'projectManager', label: 'Project Manager', type: 'text', placeholder: 'Enter project manager name', required: true },
          { name: 'overallStatus', label: 'Overall Status', type: 'select', options: ['On Track', 'At Risk', 'Behind Schedule', 'Completed'], required: true },
          { name: 'completionPercentage', label: 'Completion %', type: 'number', placeholder: 'Enter completion percentage', required: true },
          { name: 'accomplishments', label: 'Key Accomplishments', type: 'textarea', placeholder: 'List key accomplishments', required: true },
          { name: 'upcomingTasks', label: 'Upcoming Tasks', type: 'textarea', placeholder: 'List upcoming tasks', required: true },
          { name: 'risks', label: 'Risks & Issues', type: 'textarea', placeholder: 'Describe risks and issues', required: false },
          { name: 'budget', label: 'Budget Status', type: 'text', placeholder: 'Enter budget status', required: false }
        ],
        placeholders: {
          '{{projectName}}': 'projectName',
          '{{reportDate}}': 'reportDate',
          '{{projectManager}}': 'projectManager',
          '{{overallStatus}}': 'overallStatus',
          '{{completionPercentage}}': 'completionPercentage',
          '{{accomplishments}}': 'accomplishments',
          '{{upcomingTasks}}': 'upcomingTasks',
          '{{risks}}': 'risks',
          '{{budget}}': 'budget'
        }
      }
    }
  ];

  for (const template of templates) {
    await prisma.template.create({
      data: {
        ...template,
        size: Math.floor(Math.random() * 5000000) + 100000, // Random size between 100KB and 5MB
      },
    });
  }

  console.log(`✅ Created ${templates.length} template records with form fields`);
  console.log('✅ Templates seeded successfully!');

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