'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to sign-in page since we only support Google OAuth now
    router.replace('/sign-in');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting to sign in...</p>
    </div>
  );
}
