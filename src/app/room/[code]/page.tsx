'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RoomPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page - let the main page handle room logic
    router.replace('/');
  }, [router]);

  return null;
}


