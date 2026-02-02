'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiChevronRight, FiEdit2, FiTrash2, FiPlus, FiRefreshCw } from 'react-icons/fi';
import {
  listTypesAdmin,
  listCategoriesAdmin,
  createType,
  updateType,
  softDeleteType,
  restoreType,
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
  type CategoryTypeItem,
  type Category,
} from '@/app/lib/category';
import ConfirmModal from '@/app/components/ConfirmModal';
import LoadingMask from '@/app/components/LoadingMask';

type CategoryRowProps = {
  category: Category;
  depth: number;
  expandedCategoryIds: Record<number, boolean>;
  childrenByParentId: Record<number, Category[]>;
  getChildren: (parentId: number) => Category[];
  onToggleExpand: (categoryId: number) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onRestore: (c: Category) => void;
  onAddUnderParent: (parentId: number, parentName: string, depth: number) => void;
};

function CategoryRow({
  category,
  depth,
  expandedCategoryIds,
  childrenByParentId,
  getChildren,
  onToggleExpand,
  onEdit,
  onDelete,
  onRestore,
  onAddUnderParent,
}: CategoryRowProps) {
  const children = getChildren(category.id);
  const canHaveChildren = depth < 2;
  const expanded = expandedCategoryIds[category.id] !== false;
  const depthLabel = depth === 0 ? '2뎁스' : depth === 1 ? '3뎁스' : '4뎁스';
  const addChildLabel = depth === 0 ? '3뎁스' : '4뎁스';

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div
        className="grid grid-cols-[auto_1fr_4rem_4rem_4rem_8rem] gap-2 px-3 py-2 items-center cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/50"
        style={{ paddingLeft: `calc(0.75rem + ${depth * 1.5}rem)` }}
        onClick={() => canHaveChildren && onToggleExpand(category.id)}
      >
        <span className="w-6 flex items-center justify-center text-gray-500 dark:text-gray-400">
          {canHaveChildren ? (
            expanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />
          ) : (
            <span className="w-4" />
          )}
        </span>
        <span className={`text-sm ${category.deletedAt ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {category.name}
          {canHaveChildren && (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              ({depthLabel}) {children.length > 0 ? `· ${children.length}개` : ''}
            </span>
          )}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{category.sortOrder}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{category.isUsed === 1 ? '사용' : '미사용'}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{category.deletedAt ? '삭제됨' : '-'}</span>
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          {!category.deletedAt && (
            <>
              <button type="button" onClick={() => onEdit(category)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="수정" aria-label="수정">
                <FiEdit2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onDelete(category)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" title="삭제" aria-label="삭제">
                <FiTrash2 className="w-4 h-4" />
              </button>
              {canHaveChildren && (
                <button type="button" onClick={() => onAddUnderParent(category.id, category.name, depth + 1)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30" title={`${addChildLabel} 추가`} aria-label={`${addChildLabel} 추가`}>
                  <FiPlus className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          {category.deletedAt && (
            <button type="button" onClick={() => onRestore(category)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30" title="복원" aria-label="복원">
              <FiRefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {canHaveChildren && expanded && (
        <div className="bg-white dark:bg-gray-900">
          {children.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-3" style={{ paddingLeft: `calc(0.75rem + ${(depth + 1) * 1.5}rem)` }}>
              등록된 {addChildLabel}가 없습니다.
            </div>
          ) : (
            children.map((child) => (
            <CategoryRow
              key={child.id}
              category={child}
              depth={depth + 1}
              expandedCategoryIds={expandedCategoryIds}
              childrenByParentId={childrenByParentId}
              getChildren={getChildren}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onRestore={onRestore}
              onAddUnderParent={onAddUnderParent}
            />
          ))
          )}
        </div>
      )}
    </div>
  );
}

type Modal =
  | { kind: 'typeAdd' }
  | { kind: 'typeEdit'; type: CategoryTypeItem }
  | { kind: 'typeDelete'; type: CategoryTypeItem }
  | { kind: 'typeRestore'; type: CategoryTypeItem }
  | { kind: 'categoryAdd'; typeId: number; typeName: string }
  | { kind: 'categoryAddUnderParent'; parentId: number; parentName: string; depth: number }
  | { kind: 'categoryEdit'; category: Category }
  | { kind: 'categoryDelete'; category: Category }
  | { kind: 'categoryRestore'; category: Category }
  | null;

export default function CategoryPage() {
  const [types, setTypes] = useState<CategoryTypeItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [expandedTypeIds, setExpandedTypeIds] = useState<Record<number, boolean>>({});
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<number, boolean>>({});
  const [childrenByParentId, setChildrenByParentId] = useState<Record<number, Category[]>>({});
  const [modal, setModal] = useState<Modal>(null);
  const [editTypeKey, setEditTypeKey] = useState('');
  const [editName, setEditName] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editIsUsed, setEditIsUsed] = useState(1);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [typesRes, categoriesRes] = await Promise.all([
        listTypesAdmin({ includeDeleted }),
        listCategoriesAdmin({ includeDeleted }),
      ]);
      setTypes(typesRes.types);
      setCategories(categoriesRes.categories);
      setExpandedTypeIds((prev) => {
        const next = { ...prev };
        typesRes.types.forEach((t) => {
          if (next[t.id] === undefined) next[t.id] = true;
        });
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [includeDeleted]);

  const byTypeId = useMemo(() => {
    const map: Record<number, Category[]> = {};
    types.forEach((t) => (map[t.id] = []));
    categories.forEach((c) => {
      if (c.parentId == null && c.typeId != null && map[c.typeId]) map[c.typeId].push(c);
    });
    Object.keys(map).forEach((id) => map[Number(id)].sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [types, categories]);

  const toggleExpanded = (typeId: number) => {
    setExpandedTypeIds((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  };

  const toggleCategoryExpanded = useCallback(
    async (categoryId: number) => {
      setExpandedCategoryIds((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
      if (childrenByParentId[categoryId] == null) {
        try {
          const res = await listCategoriesAdmin({ parent_id: categoryId, includeDeleted });
          setChildrenByParentId((prev) => ({ ...prev, [categoryId]: res.categories }));
        } catch {
          // ignore
        }
      }
    },
    [childrenByParentId, includeDeleted]
  );

  const getChildren = (parentId: number): Category[] => {
    return childrenByParentId[parentId] ?? [];
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openTypeAdd = () => {
    setEditTypeKey('');
    setEditName('');
    setEditSortOrder(types.length);
    setEditIsUsed(1);
    setActionError(null);
    setModal({ kind: 'typeAdd' });
  };
  const openTypeEdit = (t: CategoryTypeItem) => {
    setEditTypeKey(t.typeKey);
    setEditName(t.name);
    setEditSortOrder(t.sortOrder);
    setEditIsUsed(t.isUsed);
    setActionError(null);
    setModal({ kind: 'typeEdit', type: t });
  };
  const openTypeDelete = (t: CategoryTypeItem) => setModal({ kind: 'typeDelete', type: t });
  const openTypeRestore = (t: CategoryTypeItem) => setModal({ kind: 'typeRestore', type: t });

  const openCategoryAdd = (typeId: number, typeName: string) => {
    setEditName('');
    setEditSortOrder(byTypeId[typeId]?.length ?? 0);
    setEditIsUsed(1);
    setActionError(null);
    setModal({ kind: 'categoryAdd', typeId, typeName });
  };

  const openCategoryAddUnderParent = (parentId: number, parentName: string, depth: number) => {
    const children = getChildren(parentId);
    setEditName('');
    setEditSortOrder(children.length);
    setEditIsUsed(1);
    setActionError(null);
    setModal({ kind: 'categoryAddUnderParent', parentId, parentName, depth });
  };
  const openCategoryEdit = (c: Category) => {
    setEditName(c.name);
    setEditSortOrder(c.sortOrder);
    setEditIsUsed(c.isUsed);
    setActionError(null);
    setModal({ kind: 'categoryEdit', category: c });
  };
  const openCategoryDelete = (c: Category) => setModal({ kind: 'categoryDelete', category: c });
  const openCategoryRestore = (c: Category) => setModal({ kind: 'categoryRestore', category: c });

  const handleSaveTypeNew = async () => {
    if (!editTypeKey.trim() || !editName.trim()) {
      setActionError('타입 키와 이름을 입력하세요.');
      return;
    }
    try {
      setSaving(true);
      setActionError(null);
      await createType({
        type_key: editTypeKey.trim(),
        name: editName.trim(),
        sort_order: editSortOrder,
        is_used: editIsUsed,
      });
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTypeEdit = async () => {
    if (modal?.kind !== 'typeEdit') return;
    if (!editTypeKey.trim() || !editName.trim()) {
      setActionError('타입 키와 이름을 입력하세요.');
      return;
    }
    try {
      setSaving(true);
      setActionError(null);
      await updateType(modal.type.id, {
        type_key: editTypeKey.trim(),
        name: editName.trim(),
        sort_order: editSortOrder,
        is_used: editIsUsed,
      });
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategoryNew = async () => {
    if (modal?.kind !== 'categoryAdd') return;
    if (!editName.trim()) {
      setActionError('이름을 입력하세요.');
      return;
    }
    try {
      setSaving(true);
      setActionError(null);
      await createCategory({
        type_id: modal.typeId,
        name: editName.trim(),
        sort_order: editSortOrder,
        is_used: editIsUsed,
      });
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategoryUnderParent = async () => {
    if (modal?.kind !== 'categoryAddUnderParent') return;
    if (!editName.trim()) {
      setActionError('이름을 입력하세요.');
      return;
    }
    try {
      setSaving(true);
      setActionError(null);
      await createCategory({
        parent_id: modal.parentId,
        name: editName.trim(),
        sort_order: editSortOrder,
        is_used: editIsUsed,
      });
      setModal(null);
      setChildrenByParentId((prev) => ({}));
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategoryEdit = async () => {
    if (modal?.kind !== 'categoryEdit') return;
    if (!editName.trim()) {
      setActionError('이름을 입력하세요.');
      return;
    }
    try {
      setSaving(true);
      setActionError(null);
      await updateCategory(modal.category.id, {
        name: editName.trim(),
        sort_order: editSortOrder,
        is_used: editIsUsed,
      });
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmTypeDelete = async () => {
    if (modal?.kind !== 'typeDelete') return;
    try {
      setSaving(true);
      setActionError(null);
      await softDeleteType(modal.type.id);
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmTypeRestore = async () => {
    if (modal?.kind !== 'typeRestore') return;
    try {
      setSaving(true);
      setActionError(null);
      await restoreType(modal.type.id);
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '복원에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCategoryDelete = async () => {
    if (modal?.kind !== 'categoryDelete') return;
    try {
      setSaving(true);
      setActionError(null);
      await softDeleteCategory(modal.category.id);
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCategoryRestore = async () => {
    if (modal?.kind !== 'categoryRestore') return;
    try {
      setSaving(true);
      setActionError(null);
      await restoreCategory(modal.category.id);
      setModal(null);
      fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '복원에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">카테고리 관리</h1>
        <Link
          href="/admin"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← 관리자 홈
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">삭제된 항목 포함</span>
        </label>
        <button
          type="button"
          onClick={openTypeAdd}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          + 1뎁스(타입) 추가
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <LoadingMask isOpen={loading} message="목록 불러오는 중…" />
      {!loading && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_4rem_4rem_4rem_8rem] gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <span className="w-6" />
            <span>이름</span>
            <span>정렬</span>
            <span>사용</span>
            <span>삭제</span>
            <span>작업</span>
          </div>
          {types.map((t) => {
            const items = byTypeId[t.id] ?? [];
            const expanded = expandedTypeIds[t.id] !== false;
            return (
              <div key={t.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                {/* 1뎁스 행 */}
                <div
                  className={`grid grid-cols-[auto_1fr_4rem_4rem_4rem_8rem] gap-2 px-3 py-2 items-center cursor-pointer select-none ${
                    t.deletedAt ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400' : 'bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => toggleExpanded(t.id)}
                >
                  <span className="w-6 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    {expanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t.name}
                    <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">({t.typeKey}) · {items.length}개</span>
                  </span>
                  <span>{t.sortOrder}</span>
                  <span>{t.isUsed === 1 ? '사용' : '미사용'}</span>
                  <span>{t.deletedAt ? '삭제됨' : '-'}</span>
                  <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                    {!t.deletedAt && (
                      <>
                        <button type="button" onClick={() => openTypeEdit(t)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="수정" aria-label="수정">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => openTypeDelete(t)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" title="삭제" aria-label="삭제">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => openCategoryAdd(t.id, t.name)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30" title="2뎁스 추가" aria-label="2뎁스 추가">
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {t.deletedAt && (
                      <button type="button" onClick={() => openTypeRestore(t)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30" title="복원" aria-label="복원">
                        <FiRefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* 2·3·4뎁스 행 (재귀) */}
                {expanded && (
                  <div className="bg-white dark:bg-gray-900">
                    {items.length === 0 ? (
                      <div className="pl-10 pr-3 py-4 text-sm text-gray-500 dark:text-gray-400">등록된 2뎁스가 없습니다.</div>
                    ) : (
                      items.map((c) => (
                        <CategoryRow
                          key={c.id}
                          category={c}
                          depth={0}
                          expandedCategoryIds={expandedCategoryIds}
                          childrenByParentId={childrenByParentId}
                          getChildren={getChildren}
                          onToggleExpand={toggleCategoryExpanded}
                          onEdit={openCategoryEdit}
                          onDelete={openCategoryDelete}
                          onRestore={openCategoryRestore}
                          onAddUnderParent={openCategoryAddUnderParent}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 1뎁스 추가 모달 */}
      {modal?.kind === 'typeAdd' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1뎁스(타입) 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">타입 키 (영문, 고유)</label>
                <input type="text" value={editTypeKey} onChange={(e) => setEditTypeKey(e.target.value)} placeholder="예: gender, class" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">표시명</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="예: 성별, 클래스" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">정렬순서</label>
                <input type="number" value={editSortOrder} onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editIsUsed === 1} onChange={(e) => setEditIsUsed(e.target.checked ? 1 : 0)} className="rounded border-gray-300 dark:border-gray-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">사용여부</span>
              </label>
            </div>
            {actionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">취소</button>
              <button type="button" onClick={handleSaveTypeNew} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 1뎁스 수정 모달 */}
      {modal?.kind === 'typeEdit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1뎁스 수정</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">타입 키</label>
                <input type="text" value={editTypeKey} onChange={(e) => setEditTypeKey(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">표시명</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">정렬순서</label>
                <input type="number" value={editSortOrder} onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editIsUsed === 1} onChange={(e) => setEditIsUsed(e.target.checked ? 1 : 0)} className="rounded border-gray-300 dark:border-gray-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">사용여부</span>
              </label>
            </div>
            {actionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">취소</button>
              <button type="button" onClick={handleSaveTypeEdit} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 2뎁스 추가 모달 */}
      {modal?.kind === 'categoryAdd' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{modal.typeName} · 2뎁스 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">이름</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="표시명" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">정렬순서</label>
                <input type="number" value={editSortOrder} onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editIsUsed === 1} onChange={(e) => setEditIsUsed(e.target.checked ? 1 : 0)} className="rounded border-gray-300 dark:border-gray-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">사용여부</span>
              </label>
            </div>
            {actionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">취소</button>
              <button type="button" onClick={handleSaveCategoryNew} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 3뎁스/4뎁스 추가 모달 */}
      {modal?.kind === 'categoryAddUnderParent' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {modal.depth === 1 ? '3뎁스 추가' : '4뎁스 추가'} · {modal.parentName} 하위
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">이름</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="표시명" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">정렬순서</label>
                <input type="number" value={editSortOrder} onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editIsUsed === 1} onChange={(e) => setEditIsUsed(e.target.checked ? 1 : 0)} className="rounded border-gray-300 dark:border-gray-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">사용여부</span>
              </label>
            </div>
            {actionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">취소</button>
              <button type="button" onClick={handleSaveCategoryUnderParent} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 2뎁스 수정 모달 */}
      {modal?.kind === 'categoryEdit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2뎁스 수정</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">이름</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">정렬순서</label>
                <input type="number" value={editSortOrder} onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editIsUsed === 1} onChange={(e) => setEditIsUsed(e.target.checked ? 1 : 0)} className="rounded border-gray-300 dark:border-gray-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">사용여부</span>
              </label>
            </div>
            {actionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">취소</button>
              <button type="button" onClick={handleSaveCategoryEdit} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={modal?.kind === 'typeDelete' ?? false} title="1뎁스 소프트 삭제" message={modal?.kind === 'typeDelete' ? `"${modal.type.name}" 타입을 삭제하시겠습니까? (복원 가능)` : ''} confirmText="삭제" onConfirm={handleConfirmTypeDelete} onClose={() => setModal(null)} variant="danger" />
      <ConfirmModal isOpen={modal?.kind === 'typeRestore' ?? false} title="1뎁스 복원" message={modal?.kind === 'typeRestore' ? `"${modal.type.name}" 타입을 복원하시겠습니까?` : ''} confirmText="복원" onConfirm={handleConfirmTypeRestore} onClose={() => setModal(null)} />
      <ConfirmModal isOpen={modal?.kind === 'categoryDelete' ?? false} title="2뎁스 소프트 삭제" message={modal?.kind === 'categoryDelete' ? `"${modal.category.name}" 항목을 삭제하시겠습니까? (복원 가능)` : ''} confirmText="삭제" onConfirm={handleConfirmCategoryDelete} onClose={() => setModal(null)} variant="danger" />
      <ConfirmModal isOpen={modal?.kind === 'categoryRestore' ?? false} title="2뎁스 복원" message={modal?.kind === 'categoryRestore' ? `"${modal.category.name}" 항목을 복원하시겠습니까?` : ''} confirmText="복원" onConfirm={handleConfirmCategoryRestore} onClose={() => setModal(null)} />
    </div>
  );
}
