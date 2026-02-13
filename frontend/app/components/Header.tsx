'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { User } from '@/app/lib/auth';
import {
  getStoredToken,
  setStoredToken,
  fetchMe,
  dispatchAuthChange,
} from '@/app/lib/auth';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadUser = () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetchMe(token).then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => {
      setStoredToken(null);
      setUser(null);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadUser();
    const onAuthChange = () => loadUser();
    window.addEventListener('auth-change', onAuthChange);
    return () => window.removeEventListener('auth-change', onAuthChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setDropdownOpen(false);
    dispatchAuthChange();
  };

  const displayName = user?.display_name?.trim() || user?.email || '프로필';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0c0c0f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0c0c0f]/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-white hover:text-white/90 transition-colors"
          >
            <span className="text-2xl" aria-hidden>🎴</span>
            <span>카드 생성기</span>
          </Link>
          <Link
            href="/create"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            카드생성
          </Link>
        </div>

        <nav className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-white/50">...</span>
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span className="max-w-[120px] truncate">{displayName}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-1 w-48 rounded-lg border border-white/10 bg-[#1a1a1f] py-1 shadow-lg"
                  role="menu"
                >
                  <Link
                    href="/workspace"
                    className="block px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    내 워크스페이스
                  </Link>
                  {user.is_admin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                    >
                      관리자 페이지
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors"
                    role="menuitem"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-lg px-3 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 transition-colors"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
