import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCache, setCache, delCache } from "@/lib/cache";

// GET /api/plugins - list plugins with user activation state
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email ?? null;
    let userId: string | null = (session?.user as any)?.id ?? null;

    if (!userId && userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });
      userId = user?.id ?? null;
    }

    const cacheKey = `plugins:list:${userId ?? "anon"}`;
    const cached = await getCache<{ plugins: any[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [plugins, userPlugins] = await Promise.all([
      prisma.plugin.findMany({
        orderBy: { name: "asc" },
      }),
      userId
        ? prisma.userPlugin.findMany({
            where: { userId },
            select: { pluginId: true, isActive: true },
          })
        : Promise.resolve([] as { pluginId: string; isActive: boolean }[]),
    ]);

    const userPluginMap: Record<string, boolean> = {};
    for (const up of userPlugins) {
      userPluginMap[up.pluginId] = up.isActive;
    }

    const result = plugins.map((p: any) => {
      const userActive = userId ? userPluginMap[p.id] ?? true : true;
      const effectiveActive = p.isActive && userActive;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        href: p.href,
        description: p.description ?? null,
        isActiveGlobal: p.isActive,
        isActiveUser: userActive,
        effectiveActive,
      };
    });

    const payload = { plugins: result };

    await setCache(cacheKey, payload, 60);

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/plugins] error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/plugins - toggle user activation for a plugin
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email ?? null;
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { slug, isActive } = body as { slug?: string; isActive?: boolean };

    if (!slug || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const plugin = await prisma.plugin.findUnique({ where: { slug } });
    if (!plugin) {
      return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
    }

    const userPlugin = await prisma.userPlugin.upsert({
      where: { userId_pluginId: { userId: user.id, pluginId: plugin.id } },
      create: { userId: user.id, pluginId: plugin.id, isActive },
      update: { isActive },
    });

    const nextUserActive = userPlugin.isActive;
    const effectiveActive = plugin.isActive && nextUserActive;

    // Invalidate cache for this user
    await delCache(`plugins:list:${user.id}`);

    // Simpan state per-user per-plugin di cache
    await setCache(
      `plugin:state:${user.id}:${plugin.slug}`,
      {
        isActiveUser: userPlugin.isActive,
        isActiveGlobal: plugin.isActive,
        effectiveActive,
        at: new Date().toISOString(),
      },
      60
    );

    return NextResponse.json({
      ok: true,
      plugin: {
        id: plugin.id,
        name: plugin.name,
        slug: plugin.slug,
        href: plugin.href,
        description: (plugin as any).description ?? null,
        isActiveGlobal: plugin.isActive,
        isActiveUser: nextUserActive,
        effectiveActive,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/plugins] error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
