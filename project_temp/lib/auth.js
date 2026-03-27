import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  return adminEmails.includes(user.email) || user.role === 'admin';
}
