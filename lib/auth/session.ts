import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db/prisma';

// Keep these functions for backward compatibility
export async function hashPassword(password: string): Promise<string> {
  // This is just a stub - we're not using password hashing anymore
  return '';
}

export async function comparePasswords(
  password: string,
  hash: string
): Promise<boolean> {
  // This is just a stub - we're not using password comparison anymore
  return false;
}

export async function setSession(user: any): Promise<void> {
  // This is just a stub - we're not using this anymore
  return;
}

export async function verifyToken(token: string): Promise<any> {
  // This is just a stub - we're not using this anymore
  return null;
}

export async function signToken(payload: any): Promise<string> {
  // This is just a stub - we're not using this anymore
  return '';
}

// New NextAuth-based functions
export async function getSession() {
  try {
    // @ts-ignore - NextAuth types are complex
    return await getServerSession();
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      teamMembers: {
        include: {
          team: true
        },
        take: 1
      }
    }
  });
  
  return user;
}

export async function getCurrentUserWithTeam() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const team = user.teamMembers[0]?.team;
  
  return {
    user,
    team
  };
}
