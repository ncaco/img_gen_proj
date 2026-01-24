import Link from "next/link";
import { FiHome } from "react-icons/fi";

export default function AdminHeader() {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              🎴 관리자 페이지
            </Link>
            <nav className="hidden md:flex gap-4">
              <Link
                href="/admin/card"
                className="px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                카드 목록
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              aria-label="메인으로"
              title="메인으로"
            >
              <FiHome className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
