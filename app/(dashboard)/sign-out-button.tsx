'use client';

import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <Button 
      variant="ghost" 
      onClick={() => signOut({ callbackUrl: '/sign-in' })}
    >
      Sign Out
    </Button>
  );
} 