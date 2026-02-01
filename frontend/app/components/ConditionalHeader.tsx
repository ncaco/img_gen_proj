'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

/**
 * /admin 이하 경로에서는 메인 헤더를 숨겨서 관리자 페이지에서 헤더가 하나만 보이도록 함
 */
export default function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return <Header />;
}
