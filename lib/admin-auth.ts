import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return { isAdmin: false, user: null, error: 'Unauthorized' };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    return { isAdmin: false, user: null, error: 'User not found' };
  }

  if (user.role !== 'admin') {
    return { isAdmin: false, user, error: 'Admin access required' };
  }

  return { isAdmin: true, user, error: null };
}

export async function requireAdminAuth() {
  const { isAdmin, user, error } = await checkAdminAuth();
  
  if (!isAdmin) {
    throw new Error(error || 'Admin access required');
  }
  
  return user;
}