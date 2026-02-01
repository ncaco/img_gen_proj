'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register, login, setStoredToken, dispatchAuthChange } from '@/app/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      const { access_token } = await login(email.trim(), password);
      setStoredToken(access_token);
      dispatchAuthChange();
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-white mb-6">회원가입</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
              이메일 <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-white/80 mb-1">
              표시 이름
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
              placeholder="닉네임 (선택)"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
              비밀번호 <span className="text-red-400">*</span> (8자 이상)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-white/80 mb-1">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white/20 py-2.5 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-white/60">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-white/90 hover:text-white underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
