import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting template seeding...");
  console.log("✅ Templates seeded successfully!");

  // Consultant categories
  console.log("🌱 Seeding consultant categories...");
  const categories = [
    { name: "Legal", description: "Hukum dan perizinan", icon: "gavel", color: "#6366F1" },
    { name: "Tax", description: "Perpajakan dan kepatuhan", icon: "calculator", color: "#22C55E" },
    { name: "HR", description: "Sumber daya manusia", icon: "users", color: "#F59E0B" },
    { name: "IT", description: "Teknologi informasi", icon: "cpu", color: "#0EA5E9" },
    { name: "Finance", description: "Keuangan dan akuntansi", icon: "banknote", color: "#14B8A6" },
    { name: "Business", description: "Strategi bisnis dan operasi", icon: "briefcase", color: "#EF4444" },
  ];
  for (const cat of categories) {
    const existing = await prisma.consultantCategory.findUnique({ where: { name: cat.name } });
    if (existing) {
      await prisma.consultantCategory.update({ where: { id: existing.id }, data: cat });
    } else {
      await prisma.consultantCategory.create({ data: cat });
    }
  }
  console.log("✅ Consultant categories seeded successfully!");

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

  // Plugin seeding (new)
  console.log("🌱 Starting plugin seeding...");
  const plugins = [
    {
      name: "n8n automation",
      href: "/dashboard/n8n",
      description: "Automate workflows and orchestrate integrations using n8n.",
    },
    {
      name: "Whatsapp gateway",
      href: "/dashboard/whatsapp",
      description:
        "Connect WhatsApp messaging gateway for notifications and chat.",
    },
    {
      name: "Odoo Conector",
      href: "/dashboard/odoo",
      description:
        "Sync data with Odoo ERP: customers, invoices, products, and more.",
    },
    {
      name: "Sap Conector",
      href: "/dashboard/sap",
      description:
        "Integrate with SAP systems for enterprise workflows and data.",
    },
    {
      name: "Drive Integration",
      href: "/dashboard/drive",
      description:
        "Access and manage files from cloud drive within the dashboard.",
    },
    {
      name: "Form Integration",
      href: "/dashboard/forms",
      description: "Create and process forms; route submissions to workflows.",
    },
    // remove ai  remove bg
    {
      name: "Remove AI",
      href: "/dashboard/removal",
      description: "Integrate Removal AI for image and video processing.",
    },
    // e sign
    {
      name: "e Sign",
      href: "/dashboard/esign",
      description: "Integrate e-signing for documents and agreements.",
    },
    // split pdf
    {
      name: "Split PDF",
      href: "/dashboard/split-pdf",
      description: "Split PDF documents into individual pages.",
    },
    // compress pdf
    {
      name: "Compress PDF",
      href: "/dashboard/compress-pdf",
      description: "Compress PDF documents to reduce file size.",
    },
    // compress image
    {
      name: "Compress Image",
      href: "/dashboard/compress-image",
      description: "Compress images to reduce file size.",
    },
    // crop image
    {
      name: "Crop Image",
      href: "/dashboard/crop-image",
      description: "Crop images to remove unnecessary parts.",
    },
    // resize image
    {
      name: "Resize Image",
      href: "/dashboard/resize-image",
      description: "Resize images to change dimensions.",
    },
    // transcript video
    {
      name: "Transcript Video",
      href: "/dashboard/transcript-video",
      description: "Transcribe video content into text.",
    },
    // image generator
    {
      name: "Image Generator",
      href: "/dashboard/image-generator",
      description: "Generate images using AI models.",
    },
  ].map((p) => ({
    ...p,
    slug: p.href.split("/").filter(Boolean).pop()!,
  }));

  for (const p of plugins) {
    const existing = await prisma.plugin.findUnique({
      where: { slug: p.slug },
    });
    if (existing) {
      await prisma.plugin.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          href: p.href,
          description: p.description,
          isActive: true,
        },
      });
    } else {
      await prisma.plugin.create({
        data: {
          name: p.name,
          slug: p.slug,
          href: p.href,
          description: p.description,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ Plugins seeded: ${plugins.map((p) => p.slug).join(", ")}`);

  // Sample consultants and slots (optional demo data)
  console.log("🌱 Seeding sample consultants...");
  const legalCategory = await prisma.consultantCategory.findUnique({ where: { name: "Legal" } });
  const itCategory = await prisma.consultantCategory.findUnique({ where: { name: "IT" } });
  if (legalCategory && itCategory) {
    // Ensure users exist
    const user1 = await prisma.user.upsert({
      where: { email: "legal.consultant@example.com" },
      update: { name: "Ayu Pratama" },
      create: { email: "legal.consultant@example.com", name: "Ayu Pratama" },
    });
    const user2 = await prisma.user.upsert({
      where: { email: "it.consultant@example.com" },
      update: { name: "Budi Santoso" },
      create: { email: "it.consultant@example.com", name: "Budi Santoso" },
    });

    const consultantsData = [
      {
        userId: user1.id,
        fullName: "Ayu Pratama",
        title: "Legal Advisor",
        bio: "Spesialis perizinan usaha dan kontrak.",
        profileImage: null,
        experience: 7,
        education: "S.H., Universitas Indonesia",
        certifications: [{ name: "Advokat", issuer: "PERADI" }],
        languages: ["Indonesia", "English"],
        categoryId: legalCategory.id,
        specializations: ["Contract", "Business License", "Compliance"],
        licenseNumber: "ADV-12345",
        hourlyRate: 500000,
        currency: "IDR",
        availability: [{ day: 1, start: "09:00", end: "12:00" }, { day: 3, start: "13:00", end: "17:00" }],
        responseTime: "< 24 hours",
        consultationTypes: ["online", "offline"],
        isVerified: true,
        status: "active",
        averageRating: 4.8,
      },
      {
        userId: user2.id,
        fullName: "Budi Santoso",
        title: "IT Consultant",
        bio: "Implementasi sistem dan arsitektur cloud.",
        profileImage: null,
        experience: 10,
        education: "S.Kom., Institut Teknologi Bandung",
        certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon" }],
        languages: ["Indonesia"],
        categoryId: itCategory.id,
        specializations: ["Cloud", "Security", "DevOps"],
        licenseNumber: null,
        hourlyRate: 350000,
        currency: "IDR",
        availability: [{ day: 2, start: "10:00", end: "16:00" }],
        responseTime: "< 12 hours",
        consultationTypes: ["online"],
        isVerified: true,
        status: "active",
        averageRating: 4.6,
      },
    ];

    for (const c of consultantsData) {
      const existingConsultant = await prisma.consultant.findFirst({ where: { userId: c.userId } });
      if (existingConsultant) {
        await prisma.consultant.update({ where: { id: existingConsultant.id }, data: c });
      } else {
        const created = await prisma.consultant.create({ data: c });
        // Seed slots
        const slots = [
          { consultantId: created.id, dayOfWeek: 1, startTime: "09:00", endTime: "11:00", isAvailable: true },
          { consultantId: created.id, dayOfWeek: 3, startTime: "13:00", endTime: "15:00", isAvailable: true },
        ];
        for (const s of slots) {
          await prisma.consultantSlot.create({ data: s });
        }
      }
    }
  }
  console.log("✅ Sample consultants seeded successfully!");

  // Seed sample clients, bookings, reviews, and payments for consultants
  console.log("🌱 Seeding sample consultant bookings and reviews...");
  const client1 = await prisma.user.upsert({
    where: { email: "client.one@example.com" },
    update: { name: "Client One" },
    create: { email: "client.one@example.com", name: "Client One" },
  });
  const client2 = await prisma.user.upsert({
    where: { email: "client.two@example.com" },
    update: { name: "Client Two" },
    create: { email: "client.two@example.com", name: "Client Two" },
  });

  const consultants = await prisma.consultant.findMany();
  for (const consultant of consultants) {
    // Skip if bookings already exist to keep seeding idempotent
    const existingBookingsCount = await prisma.consultantBooking.count({ where: { consultantId: consultant.id } });
    if (existingBookingsCount > 0) {
      continue;
    }

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    // Create two completed bookings per consultant
    const bookingsData = [
      {
        clientId: client1.id,
        consultantId: consultant.id,
        sessionDate: daysAgo(7),
        sessionDuration: 60,
        sessionType: "online",
        sessionUrl: "https://meet.example.com/consult-1",
        title: `Consultation with ${consultant.fullName} - Compliance Review`,
        description: "Review compliance requirements and necessary documentation.",
        documents: [],
        totalAmount: consultant.hourlyRate,
        currency: consultant.currency || "IDR",
        paymentStatus: "paid",
        status: "completed",
      },
      {
        clientId: client2.id,
        consultantId: consultant.id,
        sessionDate: daysAgo(2),
        sessionDuration: 90,
        sessionType: "online",
        sessionUrl: "https://meet.example.com/consult-2",
        title: `Consultation with ${consultant.fullName} - Strategy Session`,
        description: "Discuss strategic planning and system architecture.",
        documents: [],
        totalAmount: Math.round(consultant.hourlyRate * 1.5),
        currency: consultant.currency || "IDR",
        paymentStatus: "paid",
        status: "completed",
      },
    ];

    const createdBookings = [] as { id: string; totalAmount: number }[];
    for (const bd of bookingsData) {
      const booking = await prisma.consultantBooking.create({ data: bd });
      createdBookings.push({ id: booking.id, totalAmount: bd.totalAmount });
      // Create payment for booking
      await prisma.consultantPayment.create({
        data: {
          bookingId: booking.id,
          amount: bd.totalAmount,
          currency: bd.currency,
          paymentMethod: "credit_card",
          merchantCode: "MRC-001",
          merchantName: "DemoPay",
          transactionId: `TX-${Math.random().toString(36).slice(2, 10)}`,
          paymentUrl: null,
          status: "paid",
          paidAt: new Date(),
          failureReason: null,
          gatewayResponse: { status: "success" },
        },
      });
    }

    // Create reviews for each booking
    const reviewsData = [
      {
        bookingId: createdBookings[0].id,
        clientId: client1.id,
        consultantId: consultant.id,
        rating: 5,
        comment: "Sangat membantu dan jelas dalam menjelaskan perizinan.",
        professionalismRating: 5,
        communicationRating: 5,
        expertiseRating: 5,
        timelinessRating: 5,
        isPublic: true,
      },
      {
        bookingId: createdBookings[1].id,
        clientId: client2.id,
        consultantId: consultant.id,
        rating: 4,
        comment: "Sesi yang produktif, ada beberapa follow-up.",
        professionalismRating: 4,
        communicationRating: 4,
        expertiseRating: 4,
        timelinessRating: 4,
        isPublic: true,
      },
    ];

    for (const rd of reviewsData) {
      await prisma.consultantReview.create({ data: rd });
    }

    // Update consultant aggregates: totalReviews, averageRating, completedBookings
    const stats = await prisma.consultantReview.aggregate({
      where: { consultantId: consultant.id, isPublic: true },
      _count: { _all: true },
      _avg: { rating: true },
    });
    const completedCount = await prisma.consultantBooking.count({
      where: { consultantId: consultant.id, status: "completed" },
    });
    await prisma.consultant.update({
      where: { id: consultant.id },
      data: {
        totalReviews: stats._count._all || 0,
        averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(2)) : 0,
        completedBookings: completedCount,
        totalBookings: await prisma.consultantBooking.count({ where: { consultantId: consultant.id } }),
      },
    });
  }
  console.log("✅ Sample bookings, reviews, and payments seeded successfully!");

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
