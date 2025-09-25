import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userSettings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create default settings if they don't exist
    let settings = user.userSettings;
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const {
      theme,
      language,
      notificationsEnabled,
      autoSaveEnabled,
      defaultModel,
      maxTokens,
      temperature,
    } = await request.json();

    const updateData: any = {};

    if (theme !== undefined) {
      if (!['light', 'dark'].includes(theme)) {
        return NextResponse.json(
          { error: 'Theme must be either "light" or "dark"' },
          { status: 400 }
        );
      }
      updateData.theme = theme;
    }

    if (language !== undefined) {
      if (typeof language !== 'string') {
        return NextResponse.json(
          { error: 'Language must be a string' },
          { status: 400 }
        );
      }
      updateData.language = language;
    }

    if (notificationsEnabled !== undefined) {
      if (typeof notificationsEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'notificationsEnabled must be a boolean' },
          { status: 400 }
        );
      }
      updateData.notificationsEnabled = notificationsEnabled;
    }

    if (autoSaveEnabled !== undefined) {
      if (typeof autoSaveEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'autoSaveEnabled must be a boolean' },
          { status: 400 }
        );
      }
      updateData.autoSaveEnabled = autoSaveEnabled;
    }

    if (defaultModel !== undefined) {
      if (typeof defaultModel !== 'string') {
        return NextResponse.json(
          { error: 'defaultModel must be a string' },
          { status: 400 }
        );
      }
      updateData.defaultModel = defaultModel;
    }

    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 8192) {
        return NextResponse.json(
          { error: 'maxTokens must be a number between 1 and 8192' },
          { status: 400 }
        );
      }
      updateData.maxTokens = maxTokens;
    }

    if (temperature !== undefined) {
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
        return NextResponse.json(
          { error: 'temperature must be a number between 0 and 2' },
          { status: 400 }
        );
      }
      updateData.temperature = temperature;
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}