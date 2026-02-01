'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken, fetchMe } from '@/app/lib/auth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/');
      return;
    }
    fetchMe(token)
      .then((user) => {
        if (!user || !user.is_admin) {
          router.replace('/');
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        router.replace('/');
      });
  }, [router]);

  if (allowed === null) {
    return (
      <div className="admin-layout min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">접근 권한 확인 중...</p>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
