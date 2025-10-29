import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting template seeding...");
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
