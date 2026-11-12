import React, { useState, useMemo } from 'react';
import { Product, StockAdjustment, Category, StoreSettings } from '../types/pos';
import { formatRupiah, formatNumber } from '../utils/format';
import { soundFx } from '../utils/audio';
import { useTranslation } from '../context/LanguageContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Save,
  RotateCw,
  Tags,
  LayoutList,
  LayoutGrid,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Barcode,
  Printer,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import { compressImageFile, PRODUCT_IMAGE_PRESETS } from '../utils/imageHelper';
import { BarcodeRenderer } from './BarcodeRenderer';
import { SkuBarcodeModal } from './SkuBarcodeModal';
import { generateUniqueSku, isSkuUnique, SkuFormatType } from '../utils/skuGenerator';
import { exportInventoryToExcel } from '../utils/excelExport';

interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  storeSettings?: StoreSettings;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAdjustStock: (adjustment: Omit<StockAdjustment, 'id' | 'timestamp'>) => void;
  onOpenCategoryManager: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories: managedCategories,
  storeSettings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustStock,
  onOpenCategoryManager,
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Modal states
  const [productModalMode, setProductModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // SKU Barcode Modal states
  const [isSkuBarcodeModalOpen, setIsSkuBarcodeModalOpen] = useState(false);
  const [skuModalProduct, setSkuModalProduct] = useState<Product | null>(null);
  const [skuFormatPreset, setSkuFormatPreset] = useState<SkuFormatType>('category');

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Sembako',
    costPrice: 0,
    price: 0,
    stock: 0,
    minStock: 5,
    unit: 'pcs',
    imageUrl: '',
  });

  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'preset'>('upload');
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  // Form state for Restock / Adjustment
  const [adjustReason, setAdjustReason] = useState<StockAdjustment['reason']>('restock');
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const categories = useMemo(() => {
    const list = managedCategories.map((c) => c.name);
    return ['Semua', ...list];
  }, [managedCategories]);

  // Inventory KPI calculations
  const stats = useMemo(() => {
    const totalSKU = products.length;
    const totalPhysicalItems = products.reduce((acc, p) => acc + p.stock, 0);
    const totalAssetCost = products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
    const totalAssetRetail = products.reduce((acc, p) => acc + p.stock * p.price, 0);
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;

    return {
      totalSKU,
      totalPhysicalItems,
      totalAssetCost,
      totalAssetRetail,
      potentialProfit: totalAssetRetail - totalAssetCost,
      outOfStockCount,
      lowStockCount,
    };
  }, [products]);

  // Filtered product list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCategory =
        selectedCategory === 'Semua' || prod.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        prod.category.toLowerCase().includes(q);

      let matchStatus = true;
      if (statusFilter === 'out') matchStatus = prod.stock <= 0;
      if (statusFilter === 'low') matchStatus = prod.stock > 0 && prod.stock <= prod.minStock;
      if (statusFilter === 'normal') matchStatus = prod.stock > prod.minStock;

      return matchCategory && matchQuery && matchStatus;
    });
  }, [products, selectedCategory, searchQuery, statusFilter]);

  // Open Add Product Modal
  const handleOpenAdd = () => {
    soundFx.playTap();
    const defaultCategory =
      managedCategories.length > 0 ? managedCategories[0].name : 'Sembako';
    const smartSku = generateUniqueSku(
      { format: skuFormatPreset, categoryName: defaultCategory },
      products
    );
    setFormData({
      name: '',
      sku: smartSku,
      category: defaultCategory,
      costPrice: 5000,
      price: 7000,
      stock: 10,
      minStock: 5,
      unit: 'pcs',
      imageUrl: '',
    });
    setImageInputMode('upload');
    setEditingProduct(null);
    setProductModalMode('add');
  };

  // Regenerate SKU code in form
  const handleRegenerateFormSku = (format: SkuFormatType = skuFormatPreset) => {
    soundFx.playTap();
    const newSku = generateUniqueSku(
      { format, categoryName: formData.category },
      products,
      editingProduct?.id
    );
    setFormData((prev) => ({ ...prev, sku: newSku }));
  };

  // Open Edit Product Modal
  const handleOpenEdit = (product: Product) => {
    soundFx.playTap();
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      costPrice: product.costPrice,
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      imageUrl: product.imageUrl || '',
    });
    setImageInputMode(product.imageUrl?.startsWith('data:') ? 'upload' : product.imageUrl ? 'url' : 'upload');
    setEditingProduct(product);
    setProductModalMode('edit');
  };

  // Handle Image File Upload & Compression
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingImage(true);
      const base64Data = await compressImageFile(file, 480, 0.8);
      setFormData((prev) => ({ ...prev, imageUrl: base64Data }));
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert(language === 'en' ? 'Failed to process image file' : 'Gagal memproses file foto produk');
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Save Add/Edit
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playTap();

    if (productModalMode === 'add') {
      const newProduct: Product = {
        id: 'prod-' + Date.now(),
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category: formData.category.trim(),
        costPrice: Number(formData.costPrice) || 0,
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
        minStock: Number(formData.minStock) || 1,
        unit: formData.unit.trim() || 'pcs',
        imageUrl: formData.imageUrl.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      onAddProduct(newProduct);
    } else if (productModalMode === 'edit' && editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category: formData.category.trim(),
        costPrice: Number(formData.costPrice) || 0,
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
        minStock: Number(formData.minStock) || 1,
        unit: formData.unit.trim() || 'pcs',
        imageUrl: formData.imageUrl.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updated);
    }

    setProductModalMode(null);
    setEditingProduct(null);
  };

  // Open Restock Modal
  const handleOpenAdjust = (product: Product) => {
    soundFx.playTap();
    setAdjustModalProduct(product);
    setAdjustReason('restock');
    setAdjustAmount(10);
    setAdjustNotes('');
  };

  // Save Adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    soundFx.playTap();
    const qty = Number(adjustAmount);
    let diff = qty;

    if (adjustReason === 'damaged' || adjustReason === 'expired') {
      diff = -Math.abs(qty);
    } else if (adjustReason === 'restock' || adjustReason === 'return') {
      diff = Math.abs(qty);
    }

    const previousStock = adjustModalProduct.stock;
    const newStock = Math.max(0, previousStock + diff);

    onAdjustStock({
      productId: adjustModalProduct.id,
      productName: adjustModalProduct.name,
      sku: adjustModalProduct.sku,
      previousStock,
      newStock,
      difference: newStock - previousStock,
      reason: adjustReason,
      notes: adjustNotes.trim() || '',
    });

    setAdjustModalProduct(null);
  };

  // Quick inline increment
  const handleQuickAdd = (product: Product, delta: number) => {
    soundFx.playTap();
    onAdjustStock({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      previousStock: product.stock,
      newStock: product.stock + delta,
      difference: delta,
      reason: 'restock',
      notes: `Tambah cepat +${delta} unit`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Page Header Banner */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'en' ? 'Stock Management' : 'Manajemen Stok & Produk'}
              </span>
              <span className="text-xs text-neutral-400">·</span>
              <span className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                {stats.totalSKU} SKU · {stats.totalPhysicalItems} {language === 'en' ? 'units' : 'fisik'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mt-1 truncate">
              {t.inventory.title}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
              {language === 'en'
                ? 'Manage catalog, stock levels, pricing, barcode printing, and categories.'
                : 'Kelola katalog produk, penyesuaian stok opname, cetak barcode, dan harga.'}
            </p>
          </div>
        </div>
      </div>

      {/* Real-time KPI Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total SKUs */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">
              {language === 'en' ? 'Total Product SKUs' : 'Total Jenis Barang (SKU)'}
            </span>
            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatNumber(stats.totalSKU)}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {language === 'en' ? 'products' : 'produk'}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers pt-0.5 truncate">
            {formatNumber(stats.totalPhysicalItems)}{' '}
            {language === 'en' ? 'units in stock' : 'total unit fisik'}
          </div>
        </div>

        {/* Cost Value */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">
              {language === 'en' ? 'Inventory Cost Value' : 'Nilai Aset Modal'}
            </span>
            <DollarSign className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatRupiah(stats.totalAssetCost)}
          </div>
          <div className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-mono-numbers pt-0.5 truncate">
            {language === 'en' ? 'Retail: ' : 'Nilai Jual: '}
            {formatRupiah(stats.totalAssetRetail)}
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
          className={`p-3.5 sm:p-4 md:p-5 rounded-xl border shadow-xs cursor-pointer transition-all space-y-1 sm:space-y-1.5 ${
            statusFilter === 'low'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-700 dark:text-amber-400 truncate">{t.dashboard.lowStockAlert}</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-amber-700 dark:text-amber-400 truncate">
            {stats.lowStockCount}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {language === 'en' ? 'products' : 'produk'}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 pt-0.5 truncate">
            {language === 'en' ? 'Click to filter low stock items' : 'Saring barang menipis'}
          </div>
        </div>

        {/* Out of Stock Warning */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'out' ? 'all' : 'out')}
          className={`p-3.5 sm:p-4 md:p-5 rounded-xl border shadow-xs cursor-pointer transition-all space-y-1 sm:space-y-1.5 ${
            statusFilter === 'out'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-400'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-700 dark:text-rose-400 truncate">
              {t.dashboard.outOfStockAlert} (0)
            </span>
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-rose-700 dark:text-rose-400 truncate">
            {stats.outOfStockCount}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {language === 'en' ? 'products' : 'produk'}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 pt-0.5 truncate">
            {language === 'en' ? 'Click to filter out of stock items' : 'Saring barang stok habis'}
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full min-w-0">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 max-w-full lg:max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.inventory.searchProduct}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Action Buttons: View Switcher, Kelola Kategori & Tambah Produk (Fully Responsive & Wrapping) */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto min-w-0">
            {/* View Mode Toggle: Table vs Card */}
            <div className="flex items-center gap-0.5 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setViewMode('table');
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title={language === 'en' ? 'Table View' : 'Tampilan Tabel'}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'en' ? 'Table' : 'Tabel'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setViewMode('card');
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title={language === 'en' ? 'Card / Grid View' : 'Tampilan Kartu'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'en' ? 'Cards' : 'Kartu'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                soundFx.playTap();
                onOpenCategoryManager();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700 rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer shrink-0"
            >
              <Tags className="w-3.5 h-3.5" />
              <span>{t.inventory.manageCategories}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                setSkuModalProduct(null);
                setIsSkuBarcodeModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800 rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer shrink-0"
              title={language === 'en' ? 'Open Barcode SKU Generator & Label Printer' : 'Buka Pembuat & Cetak Barcode SKU Produk'}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'SKU Barcode Printer' : 'Cetak Barcode SKU'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                exportInventoryToExcel(products, managedCategories, storeSettings);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer shrink-0"
              title={language === 'en' ? 'Export Stock Inventory to Excel (.XLS)' : 'Ekspor Stok Inventaris ke Excel (.XLS)'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Export Excel' : 'Ekspor Excel'}</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.inventory.addProduct}</span>
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          {/* Category filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <span className="text-neutral-400 dark:text-neutral-500 text-[11px] shrink-0 font-medium">
              {t.inventory.filterCategory}:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  soundFx.playTap();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {cat === 'Semua' ? t.common.all : cat}
              </button>
            ))}
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.inventory.allStock}
            </button>
            <button
              onClick={() => setStatusFilter('low')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'low'
                  ? 'bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.inventory.lowStockOnly}
            </button>
            <button
              onClick={() => setStatusFilter('out')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'out'
                  ? 'bg-white dark:bg-neutral-900 text-rose-700 dark:text-rose-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.inventory.outOfStockOnly}
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Inventory Data Display: Table or Card View */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead className="bg-neutral-50/80 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center">{language === 'en' ? 'Photo' : 'Foto'}</th>
                  <th className="py-3 px-4">{language === 'en' ? 'SKU Code' : 'Kode / SKU'}</th>
                  <th className="py-3 px-4">{t.inventory.colProduct}</th>
                  <th className="py-3 px-4">{t.inventory.colCategory}</th>
                  <th className="py-3 px-4 text-right">{t.inventory.colCost}</th>
                  <th className="py-3 px-4 text-right">{t.inventory.colPrice}</th>
                  <th className="py-3 px-4 text-right">{language === 'en' ? 'Profit Margin' : 'Margin Untung'}</th>
                  <th className="py-3 px-4 text-center">{t.inventory.colStock}</th>
                  <th className="py-3 px-4 text-center">{t.common.status}</th>
                  <th className="py-3 px-4 text-right">{t.inventory.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                        {t.inventory.noProducts}
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        {language === 'en' ? 'Try changing filters or add a new product.' : 'Coba ganti filter atau tambahkan barang baru.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                    const marginRp = product.price - product.costPrice;
                    const marginPct =
                      product.costPrice > 0
                        ? Math.round((marginRp / product.costPrice) * 100)
                        : 0;

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/60 transition-colors"
                      >
                        {/* Photo Thumbnail */}
                        <td className="py-2.5 px-3 text-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover mx-auto border border-neutral-200/80 dark:border-neutral-700 shadow-2xs"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center mx-auto text-neutral-400 dark:text-neutral-500">
                              <Package className="w-4 h-4 opacity-40" />
                            </div>
                          )}
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 font-mono-numbers text-neutral-500 dark:text-neutral-400 font-medium">
                          {product.sku}
                        </td>

                        {/* Product Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900 dark:text-white">{product.name}</div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            {language === 'en' ? `Min threshold: ${product.minStock} ${product.unit}` : `Batas min: ${product.minStock} ${product.unit}`}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300 font-medium">
                          {product.category}
                        </td>

                        {/* Cost */}
                        <td className="py-3 px-4 text-right font-mono-numbers text-neutral-600 dark:text-neutral-400">
                          {formatRupiah(product.costPrice)}
                        </td>

                        {/* Retail Price */}
                        <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-neutral-900 dark:text-white">
                          {formatRupiah(product.price)}
                        </td>

                        {/* Margin */}
                        <td className="py-3 px-4 text-right font-mono-numbers">
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            +{formatRupiah(marginRp)}
                          </span>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-1">
                            ({marginPct}%)
                          </span>
                        </td>

                        {/* Real-time Stock Quantity & Quick Stepper */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`font-mono-numbers font-bold text-sm ${
                                isOutOfStock
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isLowStock
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-neutral-900 dark:text-white'
                              }`}
                            >
                              {product.stock}
                            </span>
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{product.unit}</span>
                            <button
                              onClick={() => handleQuickAdd(product, 5)}
                              className="ml-1 p-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                              title={language === 'en' ? 'Quick add 5 units' : 'Tambah 5 unit cepat'}
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        {/* Status indicator */}
                        <td className="py-3 px-4 text-center">
                          {isOutOfStock ? (
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              {t.inventory.outOfStockOnly}
                            </span>
                          ) : isLowStock ? (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {t.inventory.lowStockOnly}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {language === 'en' ? 'In Stock' : 'Aman'}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                soundFx.playTap();
                                setSkuModalProduct(product);
                                setIsSkuBarcodeModalOpen(true);
                              }}
                              className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors cursor-pointer"
                              title={language === 'en' ? 'Print Barcode / SKU Sticker' : 'Cetak Barcode / Stiker SKU'}
                            >
                              <Barcode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenAdjust(product)}
                              className="px-2 py-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 rounded transition-colors cursor-pointer"
                              title={t.inventory.adjustStock}
                            >
                              {t.dashboard.restockNow}
                            </button>
                            <button
                              onClick={() => handleOpenEdit(product)}
                              className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                              title={t.inventory.editProduct}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(product.id)}
                              className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                              title={t.inventory.deleteProduct}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card / Grid View */
        <div>
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center text-neutral-400 dark:text-neutral-500 shadow-xs">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{t.inventory.noProducts}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                {language === 'en' ? 'Try changing filters or add a new product.' : 'Coba ganti filter atau tambahkan barang baru.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                const marginRp = product.price - product.costPrice;
                const marginPct =
                  product.costPrice > 0
                        ? Math.round((marginRp / product.costPrice) * 100)
                        : 0;

                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Image header with overlay tags */}
                      <div className="relative w-full h-36 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600 bg-neutral-50 dark:bg-neutral-850">
                            <Package className="w-8 h-8 opacity-40" />
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                              {language === 'en' ? 'No photo' : 'Tanpa foto'}
                            </span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono-numbers font-bold px-2 py-0.5 rounded-md bg-neutral-900/80 text-white backdrop-blur-xs">
                            {product.sku}
                          </span>
                        </div>

                        {/* Stock badge top right */}
                        <div className="absolute top-2 right-2">
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                              {t.inventory.outOfStockOnly}
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                              {t.inventory.lowStockOnly}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                              {language === 'en' ? 'In Stock' : 'Stok Aman'}
                            </span>
                          )}
                        </div>

                        {/* Category pill bottom left */}
                        <div className="absolute bottom-2 left-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-200 backdrop-blur-xs shadow-xs">
                            {product.category}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 space-y-2.5">
                        <div className="min-h-[38px]">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                            {product.name}
                          </h4>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            {language === 'en' ? `Min threshold: ${product.minStock} ${product.unit}` : `Batas min: ${product.minStock} ${product.unit}`}
                          </span>
                        </div>

                        {/* Pricing details */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-lg p-2.5 space-y-1 border border-neutral-100 dark:border-neutral-700/80 text-xs font-mono-numbers">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{t.inventory.colPrice}:</span>
                            <span className="font-bold text-neutral-900 dark:text-white">{formatRupiah(product.price)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                            <span>{t.inventory.colCost}:</span>
                            <span>{formatRupiah(product.costPrice)}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 dark:border-neutral-700 text-[11px]">
                            <span className="text-neutral-500 dark:text-neutral-400">{language === 'en' ? 'Margin' : 'Untung'}:</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                              +{formatRupiah(marginRp)} ({marginPct}%)
                            </span>
                          </div>
                        </div>

                        {/* Stock status & quick add */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">{t.inventory.colStock}</span>
                            <span
                              className={`text-sm font-bold font-mono-numbers ${
                                isOutOfStock
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isLowStock
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-neutral-900 dark:text-white'
                              }`}
                            >
                              {product.stock}{' '}
                              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">{product.unit}</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(product, 5)}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            title={language === 'en' ? 'Quick add 5 units' : 'Tambah 5 unit cepat'}
                          >
                            +5 Stok
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playTap();
                          setSkuModalProduct(product);
                          setIsSkuBarcodeModalOpen(true);
                        }}
                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-white dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                        title={language === 'en' ? 'Print Barcode / SKU Sticker' : 'Cetak Barcode / Stiker SKU'}
                      >
                        <Barcode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(product)}
                        className="flex-1 py-1.5 px-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors text-center cursor-pointer"
                      >
                        {t.dashboard.restockNow}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(product)}
                        className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                        title={t.inventory.editProduct}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(product.id)}
                        className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                        title={t.inventory.deleteProduct}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {productModalMode && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full relative shadow-2xl overflow-hidden my-auto border border-neutral-200 dark:border-neutral-800">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {productModalMode === 'add'
                    ? (language === 'en' ? 'Add New Product' : 'Tambah Produk Baru')
                    : (language === 'en' ? 'Edit Product' : 'Edit Data Produk')}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {productModalMode === 'add'
                    ? (language === 'en' ? 'Fill product details and initial stock level' : 'Lengkapi data barang dan stok awal inventaris')
                    : (language === 'en' ? 'Update price, information or unit' : 'Perbarui harga, informasi, atau satuan barang')}
                </p>
              </div>
              <button
                onClick={() => setProductModalMode(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {language === 'en' ? 'Product Name' : 'Nama Barang / Produk'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={language === 'en' ? 'e.g. Premium White Rice 5kg' : 'Contoh: Beras Raja Lele 5kg'}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* SKU Generator & Unit Row */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    {language === 'en' ? 'Barcode / SKU Code' : 'Kode Barcode / SKU'}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <select
                      value={skuFormatPreset}
                      onChange={(e) => {
                        const fmt = e.target.value as SkuFormatType;
                        setSkuFormatPreset(fmt);
                        handleRegenerateFormSku(fmt);
                      }}
                      className="text-[10px] py-0.5 px-1.5 border border-neutral-300 rounded bg-neutral-50 text-neutral-700 font-medium"
                    >
                      <option value="category">Kategori (SEM-1001)</option>
                      <option value="ean13">EAN-13 (13 Digit Ritel)</option>
                      <option value="standard">Standar (SKU-100293)</option>
                      <option value="numeric">Angka 8 Digit</option>
                      <option value="short">Ringkas (3 Digit)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRegenerateFormSku(skuFormatPreset)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded cursor-pointer"
                      title="Generate SKU Baru Otomatis"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{language === 'en' ? 'Auto SKU' : 'Acak SKU'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                      placeholder="BRG-001"
                      className="w-full px-3 py-2 text-xs font-mono-numbers font-bold border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-wider"
                    />
                    {!isSkuUnique(formData.sku, products, editingProduct?.id) && (
                      <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Kode SKU ini sudah digunakan produk lain!</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder={language === 'en' ? 'pcs / bottle / kg / pack' : 'pcs / botol / kg / pack'}
                      className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Live Barcode Preview in form */}
                {formData.sku && (
                  <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-neutral-500">
                      <span className="font-semibold block text-neutral-700">Pratinjau Barcode Produk:</span>
                      <span>Bisa diprint label stiker & langsung discan kasir</span>
                    </div>
                    <div className="bg-white px-2 py-1 rounded border border-neutral-200 shrink-0">
                      <BarcodeRenderer
                        value={formData.sku}
                        height={28}
                        width={1.2}
                        fontSize={9}
                        displayValue={false}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    {t.inventory.filterCategory}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      onOpenCategoryManager();
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                  >
                    <Tags className="w-3 h-3" />
                    {language === 'en' ? '+ Manage Categories' : '+ Kelola / Tambah Kategori'}
                  </button>
                </div>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {managedCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {t.inventory.colCost} (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono-numbers border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {t.inventory.colPrice} (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono-numbers border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {productModalMode === 'add'
                      ? (language === 'en' ? 'Initial Stock' : 'Jumlah Stok Awal')
                      : (language === 'en' ? 'Current Stock' : 'Stok Saat Ini')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono-numbers border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {language === 'en' ? 'Low Stock Threshold' : 'Batas Minimum Peringatan'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: Number(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono-numbers border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Product Image Section */}
              <div className="space-y-2 p-3 bg-neutral-50/80 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    {language === 'en' ? 'Product Photo / Image' : 'Foto / Gambar Produk'}
                  </label>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      {language === 'en' ? 'Remove Photo' : 'Hapus Foto'}
                    </button>
                  )}
                </div>

                {/* Preview Thumbnail if image is set */}
                {formData.imageUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-neutral-200">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-800 truncate">
                        {language === 'en' ? 'Photo attached' : 'Foto siap disimpan'}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate font-mono">
                        {formData.imageUrl.startsWith('data:')
                          ? `${Math.round(formData.imageUrl.length / 1024)} KB (WebP Base64 terkompres)`
                          : formData.imageUrl}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Source Mode Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-neutral-200/60 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`flex-1 py-1 px-2 rounded-md font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      imageInputMode === 'upload'
                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>{language === 'en' ? 'Upload File' : 'Unggah File'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('preset')}
                    className={`flex-1 py-1 px-2 rounded-md font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      imageInputMode === 'preset'
                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{language === 'en' ? 'Quick Preset' : 'Pilihan Cepat'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`flex-1 py-1 px-2 rounded-md font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      imageInputMode === 'url'
                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>URL</span>
                  </button>
                </div>

                {/* Mode 1: File Upload */}
                {imageInputMode === 'upload' && (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      disabled={isCompressingImage}
                      className="block w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-neutral-200 rounded-lg p-1 bg-white"
                    />
                    {isCompressingImage && (
                      <p className="text-[10px] text-emerald-600 font-medium mt-1">
                        {language === 'en' ? 'Optimizing image size...' : 'Mengompresi ukuran gambar...'}
                      </p>
                    )}
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {language === 'en'
                        ? 'Files are compressed client-side (< 50KB) and saved directly to the database.'
                        : 'Foto dikompres otomatis (< 50KB) dan disimpan langsung ke database cloud tanpa perlu hosting tambahan.'}
                    </p>
                  </div>
                )}

                {/* Mode 2: Quick Presets */}
                {imageInputMode === 'preset' && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-neutral-500">
                      {language === 'en' ? 'Click any item below to use its preset photo:' : 'Pilih foto siap pakai di bawah ini:'}
                    </p>
                    <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-neutral-200">
                      {PRODUCT_IMAGE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            soundFx.playTap();
                            setFormData((prev) => ({ ...prev, imageUrl: preset.url }));
                          }}
                          className={`flex flex-col items-center p-1 rounded-lg border transition-all text-center cursor-pointer ${
                            formData.imageUrl === preset.url
                              ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-500'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-10 h-10 rounded object-cover"
                            loading="lazy"
                          />
                          <span className="text-[9px] font-medium text-neutral-700 mt-1 truncate w-full">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 3: Direct URL */}
                {imageInputMode === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {language === 'en'
                        ? 'Paste direct public image link (Unsplash, Imgur, Cloudinary, etc).'
                        : 'Masukkan link gambar online langsung (Unsplash, Imgur, Cloudinary, dll).'}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-neutral-100 flex items-center justify-end gap-2.5 -mx-5 -mb-5 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setProductModalMode(null)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Save Product' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock & Stock Adjustment Modal */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full relative shadow-2xl overflow-hidden my-auto border border-neutral-200 dark:border-neutral-800">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{t.inventory.adjustStock}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{adjustModalProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700 flex justify-between items-center text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">{t.inventory.colStock}:</span>
                <span className="font-bold font-mono-numbers text-sm text-neutral-900 dark:text-white">
                  {adjustModalProduct.stock} {adjustModalProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'en' ? 'Adjustment Reason' : 'Jenis Penyesuaian'}
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) =>
                    setAdjustReason(e.target.value as StockAdjustment['reason'])
                  }
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="restock">
                    {language === 'en' ? 'Add Stock (Supplier Purchase)' : 'Tambah Stok (Pembelian dari Supplier)'}
                  </option>
                  <option value="damaged">
                    {language === 'en' ? 'Reduce Stock (Damaged / Broken)' : 'Kurangi Stok (Barang Rusak / Pecah)'}
                  </option>
                  <option value="expired">
                    {language === 'en' ? 'Reduce Stock (Expired Goods)' : 'Kurangi Stok (Barang Kadaluarsa / Expired)'}
                  </option>
                  <option value="return">
                    {language === 'en' ? 'Add Stock (Customer Return)' : 'Tambah Stok (Retur dari Pelanggan)'}
                  </option>
                  <option value="manual">
                    {language === 'en' ? 'Physical Stock Count Correction' : 'Koreksi Stok Opname Fisik'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.common.qty} ({adjustModalProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-base font-bold font-mono-numbers border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'en' ? 'Notes / Reference (Optional)' : 'Catatan / Keterangan (Opsional)'}
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. PO Invoice #4899' : 'Contoh: Faktur PO #4899 dari Agen Sinar'}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Save Stock Adjustment' : 'Simpan Perubahan Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'en' ? 'Confirm Delete Product' : 'Konfirmasi Hapus Produk'}
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {t.inventory.confirmDelete}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => {
                  soundFx.playTap();
                  onDeleteProduct(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                {language === 'en' ? 'Yes, Delete' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKU Barcode Generator & Label Printing Modal */}
      {isSkuBarcodeModalOpen && (
        <SkuBarcodeModal
          isOpen={isSkuBarcodeModalOpen}
          onClose={() => setIsSkuBarcodeModalOpen(false)}
          products={products}
          categories={managedCategories}
          storeSettings={
            storeSettings ||
            ({
              storeName: 'KasirKu POS',
              tagline: 'Sistem Kasir Pintar',
            } as any)
          }
          initialSelectedProduct={skuModalProduct}
          onUpdateProduct={onUpdateProduct}
        />
      )}
    </div>
  );
};
