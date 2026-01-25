'use client';

import { Fragment } from 'react';
import { Transition } from '@headlessui/react';

interface LoadingMaskProps {
  isOpen: boolean;
  message?: string;
}

export default function LoadingMask({ isOpen, message = '처리 중...' }: LoadingMaskProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col items-center gap-4 min-w-[200px]">
            {/* 스피너 */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-500 rounded-full border-t-transparent animate-spin" />
            </div>
            
            {/* 메시지 */}
            {message && (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {message}
              </p>
            )}
          </div>
        </Transition.Child>
      </div>
    </Transition>
  );
}
