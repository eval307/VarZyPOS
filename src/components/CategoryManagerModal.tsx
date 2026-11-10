import React, { useState, useEffect } from 'react';
import { Category, Product } from '../types/pos';
import { soundFx } from '../utils/audio';
import { useTranslation } from '../context/LanguageContext';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen?: boolean;
  categories: Category[];
  products: Product[];
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (oldName: string, updated: Category) => void;
  onDeleteCategory: (categoryId: string, categoryName: string, fallbackCategoryName: string) => void;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen = true,
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onClose,
}) => {
  const { t } = useTranslation();
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [fallbackCategory, setFallbackCategory] = useState('Lainnya');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundFx.playTap();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Count products per category
  const productCountMap = React.useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Handle Add Category
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      soundFx.playWarning();
      setErrorMessage(`Kategori "${trimmed}" sudah ada!`);
      return;
    }

    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: trimmed,
      description: newCatDesc.trim() || '',
    };

    soundFx.playTap();
    onAddCategory(newCat);
    setNewCatName('');
    setNewCatDesc('');
    setErrorMessage(null);
  };

  // Start editing category
  const startEdit = (cat: Category) => {
    soundFx.playTap();
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
    setErrorMessage(null);
  };

  // Save edited category
  const saveEdit = (cat: Category) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    const duplicate = categories.find(
      (c) => c.id !== cat.id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      soundFx.playWarning();
      setErrorMessage(`Nama kategori "${trimmed}" sudah digunakan!`);
      return;
    }

    soundFx.playTap();
    onUpdateCategory(cat.name, {
      ...cat,
      name: trimmed,
      description: editDesc.trim() || '',
    });
    setEditingId(null);
    setErrorMessage(null);
  };

  // Prompt delete
  const promptDelete = (cat: Category) => {
    soundFx.playTap();
    setDeletingCategory(cat);
    // Find available fallback category other than the deleting one
    const available = categories.find((c) => c.id !== cat.id)?.name || 'Lainnya';
    setFallbackCategory(available);
  };

  // Confirm delete category
  const confirmDelete = () => {
    if (!deletingCategory) return;
    soundFx.playTap();
    onDeleteCategory(deletingCategory.id, deletingCategory.name, fallbackCategory);
    setDeletingCategory(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playTap();
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-xl w-full relative shadow-2xl overflow-hidden my-auto border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Tags className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {t.categories.manageTitle}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t.categories.manageSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Tambah Kategori Baru */}
          <form
            onSubmit={handleAddSubmit}
            className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/80 dark:border-neutral-700 space-y-2.5"
          >
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
              {t.categories.addCategory}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder={t.categories.catNamePlaceholder}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder={t.categories.catDescPlaceholder}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full h-full min-h-[34px] px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.categories.btnAdd}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Daftar Kategori Saat Ini */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-medium pb-1">
              <span>{t.categories.listTitle} ({categories.length})</span>
              <span>{t.categories.relatedItems}</span>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-750 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
              {categories.map((cat) => {
                const count = productCountMap[cat.name] || 0;
                const isEditing = editingId === cat.id;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      className="p-3 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-2 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder={t.categories.catNamePlaceholder}
                          className="px-2.5 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder={t.categories.catDescPlaceholder}
                          className="px-2.5 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors"
                        >
                          {t.common.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(cat)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          {t.common.save}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-white truncate">
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono-numbers">
                          ({count} {t.categories.itemsCount})
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                        title={t.categories.editTitle}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => promptDelete(cat)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                        title={t.categories.deleteTitle}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.categories.done}
          </button>
        </div>
      </div>

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-60 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              {t.categories.deleteModalTitle} &ldquo;{deletingCategory.name}&rdquo;?
            </h4>

            {productCountMap[deletingCategory.name] > 0 ? (
              <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                <p>
                  {t.categories.deleteWarning.replace('{n}', String(productCountMap[deletingCategory.name]))}
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.categories.moveItemsTo}
                  </label>
                  <select
                    value={fallbackCategory}
                    onChange={(e) => setFallbackCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories
                      .filter((c) => c.id !== deletingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {t.categories.noItemsWarning}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setDeletingCategory(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                {t.categories.btnConfirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
