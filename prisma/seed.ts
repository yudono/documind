import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting template seeding...");

  // Create 20 common HTML templates
  const templates = [
    {
      name: "Invoice Template",
      thumbnail: "https://placehold.co/300x200/7C2D12/FFFFFF?text=Invoice",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Invoice</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6;text-align:left}</style></head><body><h1>Invoice</h1><p>From: Your Business</p><p>To: Client Name</p><table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody><tr><td>Service A</td><td>1</td><td>$100</td><td>$100</td></tr></tbody><tfoot><tr><td colspan="3"><strong>Grand Total</strong></td><td><strong>$100</strong></td></tr></tfoot></table></body></html>`,
    },
    {
      name: "Business Proposal",
      thumbnail: "https://placehold.co/300x200/4F46E5/FFFFFF?text=Proposal",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Business Proposal</title><style>body{font-family:Arial;padding:24px}h1{font-size:28px;margin-bottom:8px}h2{font-size:18px;margin-top:16px}</style></head><body><h1>Business Proposal</h1><p>Executive Summary...</p><h2>Project Overview</h2><p>Describe project...</p><h2>Timeline</h2><p>Weeks and milestones...</p><h2>Budget</h2><p>Breakdown...</p></body></html>`,
    },
    {
      name: "Resume / CV",
      thumbnail: "https://placehold.co/300x200/1F2937/FFFFFF?text=Resume",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Resume</title><style>body{font-family:Arial;padding:24px}h1{font-size:24px}ul{margin:0;padding-left:16px}</style></head><body><h1>Candidate Name</h1><p>Contact | Email | Phone</p><h2>Experience</h2><ul><li>Role at Company (Years) - Achievements</li></ul><h2>Education</h2><p>Degree - University</p><h2>Skills</h2><p>List skills</p></body></html>`,
    },
    {
      name: "Cover Letter",
      thumbnail: "https://placehold.co/300x200/111827/FFFFFF?text=Cover+Letter",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Cover Letter</title><style>body{font-family:Arial;padding:24px;line-height:1.6}</style></head><body><p>Date</p><p>Hiring Manager</p><p>Company</p><p>Dear Hiring Manager,</p><p>Intro paragraph...</p><p>Body paragraph...</p><p>Closing,</p><p>Your Name</p></body></html>`,
    },
    {
      name: "Offer Letter",
      thumbnail: "https://placehold.co/300x200/2563EB/FFFFFF?text=Offer+Letter",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Offer Letter</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Offer Letter</h1><p>We are pleased to offer...</p><p>Position, Salary, Start Date...</p><p>Regards, HR</p></body></html>`,
    },
    {
      name: "Contract Agreement",
      thumbnail: "https://placehold.co/300x200/059669/FFFFFF?text=Contract",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Contract Agreement</title><style>body{font-family:Arial;padding:24px}h2{margin-top:16px}</style></head><body><h1>Service Agreement</h1><h2>Parties</h2><p>A and B...</p><h2>Scope</h2><p>Description...</p><h2>Payment</h2><p>Terms...</p><h2>Termination</h2><p>Clauses...</p></body></html>`,
    },
    {
      name: "NDA (Non-Disclosure Agreement)",
      thumbnail: "https://placehold.co/300x200/6B7280/FFFFFF?text=NDA",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>NDA</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Non-Disclosure Agreement</h1><p>Definition of Confidential Information...</p><p>Obligations...</p><p>Term...</p></body></html>`,
    },
    {
      name: "Meeting Minutes",
      thumbnail: "https://placehold.co/300x200/0891B2/FFFFFF?text=Minutes",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Meeting Minutes</title><style>body{font-family:Arial;padding:24px}ul{padding-left:16px}</style></head><body><h1>Meeting Minutes</h1><p>Date/Time/Location</p><h2>Attendees</h2><ul><li>Name</li></ul><h2>Agenda</h2><ul><li>Item</li></ul><h2>Decisions</h2><ul><li>Decision</li></ul></body></html>`,
    },
    {
      name: "Meeting Agenda",
      thumbnail: "https://placehold.co/300x200/0EA5E9/FFFFFF?text=Agenda",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Meeting Agenda</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Agenda</h1><ol><li>Welcome</li><li>Updates</li></ol></body></html>`,
    },
    {
      name: "Project Status Report",
      thumbnail:
        "https://placehold.co/300x200/DC2626/FFFFFF?text=Status+Report",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Status Report</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body><h1>Status Report</h1><p>Project: Name</p><table><tr><th>Area</th><th>Details</th></tr><tr><td>Progress</td><td>...</td></tr></table></body></html>`,
    },
    {
      name: "Project Plan",
      thumbnail: "https://placehold.co/300x200/F59E0B/FFFFFF?text=Project+Plan",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Project Plan</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Project Plan</h1><h2>Objectives</h2><p>...</p><h2>Schedule</h2><p>...</p></body></html>`,
    },
    {
      name: "Standard Operating Procedure (SOP)",
      thumbnail: "https://placehold.co/300x200/10B981/FFFFFF?text=SOP",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>SOP</title><style>body{font-family:Arial;padding:24px}ol{padding-left:16px}</style></head><body><h1>SOP</h1><ol><li>Step 1</li><li>Step 2</li></ol></body></html>`,
    },
    {
      name: "Privacy Policy",
      thumbnail:
        "https://placehold.co/300x200/9333EA/FFFFFF?text=Privacy+Policy",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Privacy Policy</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Privacy Policy</h1><p>Introduction...</p><p>Data Collection...</p></body></html>`,
    },
    {
      name: "Terms of Service",
      thumbnail:
        "https://placehold.co/300x200/7C3AED/FFFFFF?text=Terms+of+Service",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Terms of Service</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Terms of Service</h1><p>Agreement...</p><p>Use of Service...</p></body></html>`,
    },
    {
      name: "Memorandum (Memo)",
      thumbnail: "https://placehold.co/300x200/374151/FFFFFF?text=Memo",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Memo</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Memo</h1><p>To:</p><p>From:</p><p>Subject:</p><p>Body...</p></body></html>`,
    },
    {
      name: "Press Release",
      thumbnail:
        "https://placehold.co/300x200/EF4444/FFFFFF?text=Press+Release",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Press Release</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Press Release Title</h1><p>City, Date — Intro...</p><p>Details...</p></body></html>`,
    },
    {
      name: "Newsletter",
      thumbnail: "https://placehold.co/300x200/3B82F6/FFFFFF?text=Newsletter",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Newsletter</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Monthly Newsletter</h1><h2>Section</h2><p>Content...</p></body></html>`,
    },
    {
      name: "Receipt",
      thumbnail: "https://placehold.co/300x200/0EA5E9/FFFFFF?text=Receipt",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body><h1>Receipt</h1><table><tr><th>Item</th><th>Amount</th></tr><tr><td>Product</td><td>$50</td></tr></table><p>Total: $50</p></body></html>`,
    },
    {
      name: "Purchase Order",
      thumbnail: "https://placehold.co/300x200/10B981/FFFFFF?text=PO",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Purchase Order</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body><h1>Purchase Order</h1><p>Vendor: ...</p><table><tr><th>Item</th><th>Qty</th><th>Price</th></tr><tr><td>Item A</td><td>2</td><td>$20</td></tr></table></body></html>`,
    },
    {
      name: "Job Description",
      thumbnail:
        "https://placehold.co/300x200/F59E0B/FFFFFF?text=Job+Description",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Job Description</title><style>body{font-family:Arial;padding:24px}</style></head><body><h1>Job Title</h1><h2>Responsibilities</h2><ul><li>Task</li></ul><h2>Qualifications</h2><ul><li>Req</li></ul></body></html>`,
    },
    {
      name: "Quote / Quotation",
      thumbnail: "https://placehold.co/300x200/22C55E/FFFFFF?text=Quotation",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Quotation</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body><h1>Quotation</h1><table><tr><th>Item</th><th>Price</th></tr><tr><td>Service</td><td>$100</td></tr></table></body></html>`,
    },
    {
      name: "Timesheet",
      thumbnail: "https://placehold.co/300x200/06B6D4/FFFFFF?text=Timesheet",
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Timesheet</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body><h1>Timesheet</h1><table><tr><th>Date</th><th>Hours</th><th>Task</th></tr><tr><td>2024-01-01</td><td>8</td><td>Work</td></tr></table></body></html>`,
    },
  ];

  for (const template of templates) {
    await prisma.template.create({
      data: {
        name: template.name,
        thumbnail: template.thumbnail,
        html: template.html,
      },
    });
  }

  console.log(`✅ Created ${templates.length} HTML template records`);
  console.log("✅ Templates seeded successfully!");

  // Credit packages (unchanged)
  console.log("🌱 Starting credit packages seeding...");
  const creditPackages = [
    {
      name: "Pro Pack",
      description: "Professional package for regular users",
      credits: 1500,
      price: 99000,
      currency: "IDR",
      isActive: true,
    },
    {
      name: "Enterprise Pack",
      description: "Enterprise package for organizations",
      credits: 5000,
      price: 499000,
      currency: "IDR",
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
      await prisma.creditPackage.create({ data: pkg });
    }
  }
  console.log("✅ Credit packages seeded successfully!");

  // Subscription plans (unchanged)
  console.log("🌱 Starting subscription plans seeding...");
  const subscriptionPlans = [
    {
      name: "Free Plan",
      description: "Essential features for individual users",
      price: 0,
      currency: "IDR",
      dailyCredits: 3,
      monthlyCredits: 100,
      features: [
        "100 monthly credits",
        "Basic AI analysis",
        "Standard templates",
        "Email support",
      ],
      isActive: true,
    },
    {
      name: "Pro Plan",
      description: "Advanced features for professionals",
      price: 99000,
      currency: "IDR",
      dailyCredits: 50,
      monthlyCredits: 1500,
      features: [
        "1500 monthly credits",
        "Advanced AI analysis",
        "Premium templates",
        "AI Chat Assistant",
        "Priority support",
      ],
      isActive: true,
    },
    {
      name: "Enterprise Plan",
      description: "Full features for teams and organizations",
      price: 499000,
      currency: "IDR",
      dailyCredits: 167,
      monthlyCredits: 5000,
      features: [
        "5000 monthly credits",
        "Custom AI models",
        "Custom templates",
        "API access",
        "24/7 dedicated support",
      ],
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
      await prisma.subscriptionPlan.create({ data: plan });
    }
  }

  console.log("✅ Subscription plans seeded successfully!");
  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
