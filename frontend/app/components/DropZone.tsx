'use client';

import React, { useCallback, useState } from 'react';

interface DropZoneProps {
  onImageDrop: (file: File) => void;
}

export default function DropZone({ onImageDrop }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(
        (file) => file.type.startsWith('image/')
      );

      if (imageFile) {
        onImageDrop(imageFile);
      }
    },
    [onImageDrop]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const imageFile = Array.from(files).find((file) =>
          file.type.startsWith('image/')
        );
        if (imageFile) {
          onImageDrop(imageFile);
        }
      }
    },
    [onImageDrop]
  );

  return (
    <div
      className={`
        relative w-full h-64 border-2 border-dashed rounded-lg
        flex items-center justify-center
        transition-all duration-200
        ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-400 dark:hover:border-gray-500'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        id="file-input"
      />
      <label
        htmlFor="file-input"
        className="flex flex-col items-center justify-center cursor-pointer w-full h-full"
      >
        {isDragging ? (
          <>
            <svg
              className="w-16 h-16 text-blue-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
              여기에 놓으세요!
            </p>
          </>
        ) : (
          <>
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-lg mb-2">
              이미지를 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              PNG, JPG, GIF 등 이미지 파일 지원
            </p>
          </>
        )}
      </label>
    </div>
  );
}
