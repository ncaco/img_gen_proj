'use client';

import { useEffect, useState } from 'react';
import { API_BASE, getStoredToken } from '@/app/lib/auth';
import LoadingMask from '@/app/components/LoadingMask';
import { FiRefreshCw } from 'react-icons/fi';

type OperationType = 'post_creation' | 'image_generation';

interface ApiUsageLogItem {
  id: number;
  operationType: OperationType;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: string | null;
  userId: number | null;
  extra: Record<string, any> | null;
  createdAt: string;
}

interface ApiUsageLogListResponse {
  success: boolean;
  total: number;
  items: ApiUsageLogItem[];
}

const PAGE_SIZE = 50;

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ApiUsageLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<string>('');
  const [modelFilter, setModelFilter] = useState('');
  const [page, setPage] = useState(0);

  const fetchLogs = async () => {
    const token = getStoredToken();
    if (!token) {
      setError('로그인 토큰이 없습니다. 다시 로그인해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));
    if (operationType) params.set('operationType', operationType);
    if (modelFilter.trim()) params.set('model', modelFilter.trim());

    try {
      const res = await fetch(`${API_BASE}/api/v1/logs/api-usage?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? '로그 조회 중 오류가 발생했습니다.');
      }

      const data: ApiUsageLogListResponse = await res.json();
      setLogs(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message ?? '로그 조회 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">API 사용 로그</h1>
        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <FiRefreshCw className="w-3 h-3" />
          새로고침
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">구분</label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 text-xs text-gray-900 dark:text-white"
          >
            <option value="">전체</option>
            <option value="post_creation">글생성</option>
            <option value="image_generation">이미지생성</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">모델명</label>
          <input
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            placeholder="예: gpt-4o-mini"
            className="h-8 w-40 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 text-xs text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="h-8 inline-flex items-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
        >
          조회
        </button>
        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          총 {total}건 / 페이지 {page + 1} / {totalPages}
        </div>
      </div>

      <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {loading && <LoadingMask isOpen={loading} message="로그를 불러오는 중입니다..." />}
        {error && (
          <div className="p-4 text-sm text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-gray-700">
            {error}
          </div>
        )}
        <div className="max-h-[600px] overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  시각
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  구분
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  모델
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  입력 토큰
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  출력 토큰
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  비용(USD)
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  사용자
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  기타
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    조회된 로그가 없습니다.
                  </td>
                </tr>
              )}
              {logs.map((log) => {
                const createdAt = new Date(log.createdAt);
                const dateStr = isNaN(createdAt.getTime())
                  ? log.createdAt
                  : createdAt.toLocaleString();
                const typeLabel =
                  log.operationType === 'image_generation'
                    ? '이미지생성'
                    : '글생성';

                let extraText = '';
                if (log.extra) {
                  try {
                    extraText = JSON.stringify(log.extra);
                  } catch {
                    extraText = String(log.extra);
                  }
                }
                if (extraText.length > 80) {
                  extraText = extraText.slice(0, 80) + '…';
                }

                return (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                  >
                    <td className="px-3 py-1.5 text-[11px] text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-900 dark:text-white whitespace-nowrap">
                      {typeLabel}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {log.model ?? '-'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {log.inputTokens ?? '-'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {log.outputTokens ?? '-'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {log.costUsd ?? '-'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {log.userId ?? '-'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                      {extraText || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
          <div>
            페이지 {page + 1} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 disabled:opacity-50"
            >
              이전
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

