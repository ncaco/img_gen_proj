'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';

const MAX_LENGTH_DEFAULT = 2200;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(text: string): string {
  if (!text.trim()) return '<p></p>';
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return '<p></p>';
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
}

export interface CaptionEditorRef {
  setContent: (plainText: string) => void;
  getContent: () => string;
  focus: () => void;
}

interface CaptionEditorProps {
  initialContent?: string;
  onChange?: (plainText: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CaptionEditor = forwardRef<CaptionEditorRef, CaptionEditorProps>(function CaptionEditor(
  {
    initialContent = '',
    onChange,
    maxLength = MAX_LENGTH_DEFAULT,
    placeholder = '한 줄 소개, 본문, 해시태그를 한 곳에서 작성하세요. (엔터로 줄바꿈)',
    className = '',
    disabled = false,
  },
  ref
) {
  const lastValidText = useRef(initialContent);
  const isExternalUpdate = useRef(false);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: textToHtml(initialContent),
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'min-h-[180px] w-full px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-lg border-0 outline-none prose prose-sm max-w-none dark:prose-invert',
      },
      handleDOMEvents: {
        paste: (view, event) => {
          event.preventDefault();
          const text = event.clipboardData?.getData('text/plain') ?? '';
          const { state, dispatch } = view;
          const tr = state.tr.insertText(text);
          dispatch(tr);
          return true;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const text = editor.getText().replace(/\n\n+/g, '\n\n').trimEnd();
      setCharCount(text.length);
      if (text.length > maxLength) {
        editor.commands.setContent(textToHtml(lastValidText.current));
        setCharCount(lastValidText.current.length);
        return;
      }
      lastValidText.current = text;
      onChange?.(text);
    },
    onCreate: ({ editor }) => {
      const t = editor.getText().replace(/\n\n+/g, '\n\n').trimEnd();
      if (t.length <= maxLength) lastValidText.current = t;
      setCharCount(lastValidText.current.length);
    },
  });

  useEffect(() => {
    if (!editor || initialContent === lastValidText.current) return;
    isExternalUpdate.current = true;
    editor.commands.setContent(textToHtml(initialContent));
    lastValidText.current = initialContent;
    setCharCount(initialContent.length);
    isExternalUpdate.current = false;
  }, [initialContent, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const setContent = useCallback(
    (plainText: string) => {
      const truncated = plainText.slice(0, maxLength);
      lastValidText.current = truncated;
      isExternalUpdate.current = true;
      editor?.commands.setContent(textToHtml(truncated));
      setCharCount(truncated.length);
      isExternalUpdate.current = false;
      onChange?.(truncated);
    },
    [editor, maxLength, onChange]
  );

  const getContent = useCallback(() => {
    return editor?.getText().replace(/\n\n+/g, '\n\n').trimEnd() ?? lastValidText.current;
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      setContent,
      getContent,
      focus: () => editor?.commands.focus(),
    }),
    [setContent, getContent, editor]
  );

  return (
    <div className={className}>
      <div className="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-pink-500 focus-within:border-transparent">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-1 flex justify-end">
        <span
          className={`text-xs ${
            charCount > maxLength ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {charCount} / {maxLength}
        </span>
      </div>
    </div>
  );
});

export default CaptionEditor;
