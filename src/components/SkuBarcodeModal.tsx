import React, { useState, useMemo } from 'react';
import {
  Product,
  Category,
  StoreSettings,
  SkuLabelConfig,
  DEFAULT_SKU_LABEL_CONFIG,
  LabelPaperSize,
} from '../types/pos';
import { formatRupiah } from '../utils/format';
import { soundFx } from '../utils/audio';
import { useTranslation } from '../context/LanguageContext';
import { BarcodeRenderer } from './BarcodeRenderer';
import {
  generateCandidateSku,
  generateUniqueSku,
  SkuFormatType,
} from '../utils/skuGenerator';
import {
  Printer,
  X,
  Sparkles,
  Barcode,
  QrCode,
  Check,
  RotateCw,
  Copy,
  Layers,
  Settings2,
  Tag,
  CreditCard,
  Banknote,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  ArrowLeft,
} from 'lucide-react';

interface SkuBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  storeSettings: StoreSettings;
  initialSelectedProduct?: Product | null;
  onUpdateProduct?: (product: Product) => void;
}

export const SkuBarcodeModal: React.FC<SkuBarcodeModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  storeSettings,
  initialSelectedProduct = null,
  onUpdateProduct,
}) => {
  const { language } = useTranslation();

  // Active top tab
  const [activeTab, setActiveTab] = useState<'labels' | 'generator' | 'pos_actions'>('labels');

  // Mobile / Tablet sub-tab toggle (< lg) between configuration and live preview
  const [mobileModalTab, setMobileModalTab] = useState<'config' | 'preview'>('config');

  // Label configuration
  const [config, setConfig] = useState<SkuLabelConfig>(DEFAULT_SKU_LABEL_CONFIG);

  // Selected products for printing: Map of productId -> quantity of labels
  const [selectedProductMap, setSelectedProductMap] = useState<Record<string, number>>(() => {
    if (initialSelectedProduct) {
      return { [initialSelectedProduct.id]: 1 };
    }
    // Default to first 5 products or all if less
    const initialMap: Record<string, number> = {};
    products.slice(0, 5).forEach((p) => {
      initialMap[p.id] = 1;
    });
    return initialMap;
  });

  // Filter & Search inside the modal
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  // Generator tab states
  const [generatorTargetProductId, setGeneratorTargetProductId] = useState<string>(
    initialSelectedProduct ? initialSelectedProduct.id : products[0]?.id || ''
  );
  const [generatorFormat, setGeneratorFormat] = useState<SkuFormatType>('category');
  const [generatedSku, setGeneratedSku] = useState<string>(() => {
    if (initialSelectedProduct?.sku) return initialSelectedProduct.sku;
    return generateUniqueSku({ format: 'category' }, products);
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Action Barcodes for hands-free Cashier
  const actionCommands = [
    {
      code: 'CMD-PAY',
      label: language === 'en' ? 'Open Payment / Checkout' : 'Buka Menu Pembayaran',
      subtext: language === 'en' ? 'Scan to enter payment modal' : 'Scan untuk langsung masuk langkah bayar',
      icon: CreditCard,
    },
    {
      code: 'CMD-CASH',
      label: language === 'en' ? 'Pay Exact Cash' : 'Bayar Tunai Uang Pas',
      subtext: language === 'en' ? 'Instantly complete transaction' : 'Selesaikan transaksi tunai seketika',
      icon: Banknote,
    },
    {
      code: 'CMD-CLEAR',
      label: language === 'en' ? 'Clear POS Cart' : 'Kosongkan Keranjang Kasir',
      subtext: language === 'en' ? 'Reset cart items safely' : 'Hapus semua item dari keranjang',
      icon: Trash2,
    },
  ];
  const [selectedActionCodes, setSelectedActionCodes] = useState<string[]>(['CMD-PAY', 'CMD-CASH', 'CMD-CLEAR']);

  if (!isOpen) return null;

  // Filtered product selection list
  const filteredProducts = products.filter((p) => {
    const matchCat = categoryFilter === 'Semua' || p.category === categoryFilter;
    const q = searchFilter.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const selectedCount = Object.keys(selectedProductMap).filter((id) => selectedProductMap[id] > 0).length;

  const totalStickersToPrint = useMemo(() => {
    if (activeTab === 'pos_actions') return selectedActionCodes.length;
    return Object.values(selectedProductMap).reduce((sum, qty) => sum + qty, 0);
  }, [activeTab, selectedProductMap, selectedActionCodes]);

  // Handle Select All / Unselect All
  const handleToggleSelectAll = () => {
    soundFx.playTap();
    if (selectedCount === filteredProducts.length) {
      setSelectedProductMap({});
    } else {
      const nextMap: Record<string, number> = { ...selectedProductMap };
      filteredProducts.forEach((p) => {
        nextMap[p.id] = config.useStockAsCopies ? Math.max(1, p.stock) : config.copiesPerProduct;
      });
      setSelectedProductMap(nextMap);
    }
  };

  // Toggle single product selection
  const handleToggleProduct = (productId: string) => {
    soundFx.playTap();
    const prod = products.find((p) => p.id === productId);
    setSelectedProductMap((prev) => {
      const copy = { ...prev };
      if (copy[productId]) {
        delete copy[productId];
      } else {
        copy[productId] = config.useStockAsCopies && prod ? Math.max(1, prod.stock) : config.copiesPerProduct;
      }
      return copy;
    });
  };

  // Change quantity for a specific product
  const handleSetProductQty = (productId: string, qty: number) => {
    const cleanQty = Math.max(1, Math.min(999, qty || 1));
    setSelectedProductMap((prev) => ({
      ...prev,
      [productId]: cleanQty,
    }));
  };

  // Apply copies mode across all selected
  const handleApplyCopiesRule = (useStock: boolean, fixedCount = 1) => {
    soundFx.playTap();
    setConfig((prev) => ({
      ...prev,
      useStockAsCopies: useStock,
      copiesPerProduct: fixedCount,
    }));

    setSelectedProductMap((prev) => {
      const next: Record<string, number> = {};
      Object.keys(prev).forEach((id) => {
        const prod = products.find((p) => p.id === id);
        if (prod) {
          next[id] = useStock ? Math.max(1, prod.stock) : fixedCount;
        }
      });
      return next;
    });
  };

  // Generate new SKU for selected product in generator tab
  const handleGenerateNewSku = () => {
    soundFx.playTap();
    const targetProd = products.find((p) => p.id === generatorTargetProductId);
    const catName = targetProd ? targetProd.category : 'Semua';
    const newSku = generateUniqueSku(
      {
        format: generatorFormat,
        categoryName: catName,
      },
      products,
      targetProd?.id
    );
    setGeneratedSku(newSku);
    setSaveSuccessMsg(null);
  };

  // Save generated SKU to product
  const handleSaveGeneratedSku = () => {
    soundFx.playTap();
    const targetProd = products.find((p) => p.id === generatorTargetProductId);
    if (!targetProd) return;

    if (onUpdateProduct) {
      onUpdateProduct({
        ...targetProd,
        sku: generatedSku.trim().toUpperCase(),
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccessMsg(
        language === 'en'
          ? `SKU successfully updated to "${generatedSku}" for ${targetProd.name}`
          : `Kode SKU berhasil diperbarui menjadi "${generatedSku}" untuk ${targetProd.name}`
      );
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    soundFx.playScanBeep();
    window.print();
  };

  // Compile items to be rendered in preview / print container
  const itemsToPrint = useMemo(() => {
    if (activeTab === 'pos_actions') {
      return actionCommands
        .filter((cmd) => selectedActionCodes.includes(cmd.code))
        .map((cmd) => ({
          id: cmd.code,
          name: cmd.label,
          sku: cmd.code,
          price: 0,
          category: 'KASIR COMMAND',
          isAction: true,
          subtext: cmd.subtext,
        }));
    }

    const list: Product[] = [];
    Object.entries(selectedProductMap).forEach(([prodId, count]) => {
      const prod = products.find((p) => p.id === prodId);
      if (prod && count > 0) {
        for (let i = 0; i < count; i++) {
          list.push(prod);
        }
      }
    });
    return list;
  }, [activeTab, selectedProductMap, selectedActionCodes, products]);

  // CSS dimensions for preview card based on paper size
  const getCardStyle = (paperSize: LabelPaperSize) => {
    switch (paperSize) {
      case 'thermal_40x30':
        return {
          width: '155px',
          minHeight: '115px',
          padding: '6px 8px',
          fontSize: '10px',
        };
      case 'thermal_50x30':
        return {
          width: '190px',
          minHeight: '115px',
          padding: '6px 10px',
          fontSize: '11px',
        };
      case 'receipt_58mm':
        return {
          width: '210px',
          minHeight: '125px',
          padding: '8px 12px',
          fontSize: '11px',
        };
      case 'receipt_80mm':
        return {
          width: '280px',
          minHeight: '135px',
          padding: '10px 14px',
          fontSize: '12px',
        };
      case 'a4_grid':
      default:
        return {
          width: '180px',
          minHeight: '118px',
          padding: '8px 10px',
          fontSize: '11px',
        };
    }
  };

  const cardStyle = getCardStyle(config.paperSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Embedded print stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #sku-barcode-printable-area, #sku-barcode-printable-area * {
            visibility: visible !important;
          }
          #sku-barcode-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 2mm !important;
            align-content: flex-start !important;
          }
          .sku-print-card {
            box-shadow: none !important;
            border: 1px dashed #bbb !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
          }
          @page {
            size: auto;
            margin: 3mm;
          }
        }
      `}</style>

      {/* Main Modal Container */}
      <div className="relative w-full max-w-6xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  {language === 'en' ? 'SKU Code Generator & Label Printer' : 'Pembuat Kode SKU & Cetak Label Barcode'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full">
                  Siap Scan di Kasir
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'en'
                  ? 'Generate unique SKU codes, customize sticker labels, and print to attach to physical items'
                  : 'Buat kode SKU unik, sesuaikan format stiker, dan cetak untuk ditempel ke produk toko'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playTap();
                onClose();
              }}
              className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Horizontally scrollable for mobile & tablet) */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 pt-2 sm:pt-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto scrollbar-none whitespace-nowrap">
          <button
            onClick={() => {
              soundFx.playTap();
              setActiveTab('labels');
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'labels'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{language === 'en' ? 'Product Barcode Labels' : 'Cetak Label Stiker Produk'}</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800 font-mono">
              {totalStickersToPrint}
            </span>
          </button>

          <button
            onClick={() => {
              soundFx.playTap();
              setActiveTab('generator');
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'generator'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{language === 'en' ? 'SKU Code Generator' : 'Generator SKU Baru'}</span>
          </button>

          <button
            onClick={() => {
              soundFx.playTap();
              setActiveTab('pos_actions');
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'pos_actions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{language === 'en' ? 'Cashier Action Barcodes' : 'Kartu Perintah Barcode Kasir'}</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
              Express
            </span>
          </button>
        </div>

        {/* Mobile & Tablet Sub-Tab Switcher (< lg) to ensure zero cut off */}
        <div className="lg:hidden flex items-center p-1.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setMobileModalTab('config');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileModalTab === 'config'
                ? 'bg-white dark:bg-neutral-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Settings & Items' : 'Pengaturan & Produk'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setMobileModalTab('preview');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              mobileModalTab === 'preview'
                ? 'bg-white dark:bg-neutral-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Sticker Preview' : 'Pratinjau Stiker'}</span>
            <span className="ml-1 bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {itemsToPrint.length}
            </span>
          </button>
        </div>

        {/* Modal Body: Split 2 columns on desktop (lg:), clean tabs on mobile/tablet */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT COLUMN: Controls & Settings (5 cols) */}
          <div
            className={`lg:col-span-5 p-4 sm:p-5 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto space-y-4 max-h-[75vh] ${
              mobileModalTab === 'config' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* TAB 1: Labels Setting & Selection */}
            {activeTab === 'labels' && (
              <>
                {/* Paper & Sticker Size Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>{language === 'en' ? 'Label / Sticker Format' : 'Ukuran Kertas & Stiker Label'}</span>
                    <span className="text-[11px] font-normal text-neutral-400 font-mono">
                      {config.paperSize}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'thermal_40x30' as LabelPaperSize, name: 'Stiker Roll 40x30mm', desc: 'Standar Toko / Minimarket' },
                      { id: 'thermal_50x30' as LabelPaperSize, name: 'Stiker Roll 50x30mm', desc: 'Label Sedang' },
                      { id: 'receipt_58mm' as LabelPaperSize, name: 'Thermal Kasir 58mm', desc: 'Kertas Struk 58' },
                      { id: 'receipt_80mm' as LabelPaperSize, name: 'Thermal Kasir 80mm', desc: 'Kertas Struk 80' },
                      { id: 'a4_grid' as LabelPaperSize, name: 'Lembar A4 Grid', desc: 'Stiker Tom & Jerry / Camel' },
                    ].map((item) => {
                      const isSel = config.paperSize === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            soundFx.playTap();
                            setConfig({ ...config, paperSize: item.id });
                          }}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            isSel
                              ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-850'
                          }`}
                        >
                          <div className="font-semibold text-xs leading-tight">{item.name}</div>
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{item.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Barcode Type & Elements */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {language === 'en' ? 'Barcode Symbology' : 'Tipe Simbol Barcode'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playTap();
                        setConfig({ ...config, barcodeType: 'barcode' });
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        config.barcodeType === 'barcode'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <Barcode className="w-4 h-4 text-indigo-600" />
                      <span>Barcode 1D (Code 128 / EAN)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playTap();
                        setConfig({ ...config, barcodeType: 'qrcode' });
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        config.barcodeType === 'qrcode'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      <span>QR Code (2D Scanner / HP)</span>
                    </button>
                  </div>
                </div>

                {/* Visible Elements Toggles */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {language === 'en' ? 'Sticker Content Details' : 'Informasi yang Ditampilkan di Stiker'}
                  </label>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.showStoreName}
                        onChange={(e) => setConfig({ ...config, showStoreName: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Nama Toko ({storeSettings.storeName})</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.showProductName}
                        onChange={(e) => setConfig({ ...config, showProductName: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Nama Produk</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.showPrice}
                        onChange={(e) => setConfig({ ...config, showPrice: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Harga Jual (Rp)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.showSkuText}
                        onChange={(e) => setConfig({ ...config, showSkuText: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Teks Kode SKU</span>
                    </label>
                  </div>
                </div>

                {/* Print Quantity Rules */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {language === 'en' ? 'Quantity Rules' : 'Jumlah Cetak per Produk'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyCopiesRule(false, 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                        !config.useStockAsCopies && config.copiesPerProduct === 1
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      1 Label per Produk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCopiesRule(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                        config.useStockAsCopies
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                      title="Cetak stiker sebanyak stok fisik produk saat ini (misal stok 10 = cetak 10 label)"
                    >
                      ✨ Sesuai Stok Fisik
                    </button>
                  </div>
                </div>

                {/* Product Selection List with Search */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      {language === 'en' ? 'Select Products to Print' : 'Pilih Produk yang Ingin Dicetak'}{' '}
                      <span className="text-neutral-400 font-normal">({selectedCount} dipilih)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer"
                    >
                      {selectedCount === filteredProducts.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  {/* Search & Category Filter */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Cari produk / SKU..."
                      className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-neutral-800"
                    />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                    >
                      <option value="Semua">Semua Kategori</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product items scroll list */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50/50 dark:bg-neutral-900/50">
                    {filteredProducts.map((prod) => {
                      const isSelected = Boolean(selectedProductMap[prod.id]);
                      const qty = selectedProductMap[prod.id] || 1;
                      return (
                        <div
                          key={prod.id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                              : 'bg-white dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProduct(prod.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-neutral-900 dark:text-white truncate">
                                {prod.name}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
                                <span>{prod.sku}</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-semibold">{formatRupiah(prod.price)}</span>
                                <span>•</span>
                                <span>Stok: {prod.stock}</span>
                              </div>
                            </div>
                          </label>

                          {isSelected && (
                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                              <span className="text-[10px] text-neutral-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max="999"
                                value={qty}
                                onChange={(e) => handleSetProductQty(prod.id, parseInt(e.target.value, 10))}
                                className="w-12 px-1.5 py-0.5 text-center text-xs font-mono border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredProducts.length === 0 && (
                      <div className="text-center py-6 text-xs text-neutral-400">
                        Tidak ada produk yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: SKU Generator Controls */}
            {activeTab === 'generator' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Generator SKU Cerdas KasirKu</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    Hasilkan kode SKU unik otomatis yang kompatibel dengan standar barcode ritel 1D (Code 128 & EAN-13), siap discan oleh scanner USB kasir maupun kamera handphone.
                  </p>
                </div>

                {/* Target Product */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {language === 'en' ? 'Target Product' : 'Pilih Produk yang Ingin Dibuatkan SKU'}
                  </label>
                  <select
                    value={generatorTargetProductId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setGeneratorTargetProductId(pid);
                      const prod = products.find((p) => p.id === pid);
                      if (prod) {
                        setGeneratedSku(prod.sku || generateUniqueSku({ format: generatorFormat, categoryName: prod.category }, products, prod.id));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (SKU Saat ini: {p.sku || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU Format Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {language === 'en' ? 'SKU Code Format' : 'Pilihan Format Kode SKU'}
                  </label>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {[
                      {
                        id: 'category' as SkuFormatType,
                        name: 'Singkatan Kategori + Nomor (Contoh: SEM-1048)',
                        desc: 'Paling mudah dibaca kasir secara visual (Sembako, Minuman, Makanan, dll)',
                      },
                      {
                        id: 'ean13' as SkuFormatType,
                        name: 'Standar Barcode Ritel EAN-13 (13 Digit)',
                        desc: 'Standar ritel global dengan checksum Modulo-10 (Awalan 200... in-store)',
                      },
                      {
                        id: 'standard' as SkuFormatType,
                        name: 'Standar Alphanumerik (Contoh: SKU-829104)',
                        desc: 'Kombinasi 6 angka unik acak',
                      },
                      {
                        id: 'numeric' as SkuFormatType,
                        name: 'Numerik Murni 8 Digit (Contoh: 10482914)',
                        desc: 'Hanya angka, sangat cepat discan oleh alat barcode scanner lama',
                      },
                      {
                        id: 'short' as SkuFormatType,
                        name: 'Format Ringkas (Contoh: BEV-301)',
                        desc: '3 digit pendek untuk toko dengan jumlah barang sedikit',
                      },
                    ].map((fmt) => {
                      const isSel = generatorFormat === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => {
                            soundFx.playTap();
                            setGeneratorFormat(fmt.id);
                            const targetProd = products.find((p) => p.id === generatorTargetProductId);
                            const newCode = generateUniqueSku(
                              { format: fmt.id, categoryName: targetProd?.category },
                              products,
                              targetProd?.id
                            );
                            setGeneratedSku(newCode);
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isSel
                              ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-850'
                          }`}
                        >
                          <div className="font-semibold text-xs">{fmt.name}</div>
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{fmt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Generated SKU Display & Action */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Hasil Kode SKU Baru
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={generatedSku}
                      onChange={(e) => setGeneratedSku(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 text-sm font-mono font-bold tracking-wider text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/40 dark:bg-neutral-800 text-center"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateNewSku}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      title="Acak / Buat SKU Baru"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Acak Baru</span>
                    </button>
                  </div>

                  {saveSuccessMsg && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveGeneratedSku}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan SKU Baru ke Produk Ini</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: POS Action Barcodes */}
            {activeTab === 'pos_actions' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Kartu Perintah Barcode Kasir Cepat (Express Action Cards)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    Cetak kartu barcode ini dan tempel di dekat meja kasir. Kasir cukup menembakkan scanner barcode ke kode ini untuk langsung membuka popup pembayaran atau menyelesaikan transaksi tanpa menyentuh mouse/keyboard!
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Pilih Kartu Perintah yang Ingin Dicetak:
                  </label>
                  <div className="space-y-2">
                    {actionCommands.map((cmd) => {
                      const isSel = selectedActionCodes.includes(cmd.code);
                      const IconComp = cmd.icon;
                      return (
                        <div
                          key={cmd.code}
                          onClick={() => {
                            soundFx.playTap();
                            setSelectedActionCodes((prev) =>
                              prev.includes(cmd.code)
                                ? prev.filter((c) => c !== cmd.code)
                                : [...prev, cmd.code]
                            );
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSel
                              ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-neutral-900 dark:text-white">
                                {cmd.label}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-mono">
                                Barcode Command: <span className="font-bold text-neutral-800 dark:text-neutral-200">{cmd.code}</span>
                              </div>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border ${
                              isSel
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-neutral-300 dark:border-neutral-700'
                            }`}
                          >
                            {isSel && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Quick jump to preview on mobile/tablet (< lg) */}
            <div className="lg:hidden pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setMobileModalTab('preview');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{language === 'en' ? `View Sticker Preview (${itemsToPrint.length}) →` : `Lihat Pratinjau Stiker (${itemsToPrint.length}) →`}</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Realistic Sticker Print Preview (7 cols on lg, full view on mobile/tablet) */}
          <div
            className={`lg:col-span-7 bg-neutral-100/70 dark:bg-neutral-950/50 p-4 sm:p-5 flex flex-col justify-between overflow-hidden ${
              mobileModalTab === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTap();
                    setMobileModalTab('config');
                  }}
                  className="lg:hidden p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 cursor-pointer"
                  title="Kembali ke Pengaturan"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Eye className="w-4 h-4 text-neutral-500 shrink-0" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                  {language === 'en' ? 'Live Realistic Sticker Preview' : 'Pratinjau Fisik Stiker Siap Cetak'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-mono font-medium shrink-0">
                  {itemsToPrint.length} Label
                </span>
              </div>

              <div className="text-[11px] text-neutral-500">
                Format: <strong className="font-semibold text-neutral-800 dark:text-neutral-200">{config.paperSize}</strong>
              </div>
            </div>

            {/* Scrollable Realistic Sticker Canvas */}
            <div className="flex-1 overflow-y-auto py-4 px-2 flex flex-wrap items-start justify-center gap-3 sm:gap-4 max-h-[60vh] scrollbar-thin">
              {activeTab === 'generator' ? (
                // Single live generated SKU card
                <div
                  style={cardStyle}
                  className="bg-white text-neutral-900 rounded-lg border-2 border-neutral-300 shadow-sm flex flex-col items-center justify-between text-center select-none shrink-0"
                >
                  {config.showStoreName && (
                    <div className="text-[9px] font-bold text-neutral-500 tracking-wider uppercase border-b border-neutral-100 w-full pb-0.5 truncate">
                      {storeSettings.storeName}
                    </div>
                  )}

                  <div className="w-full my-auto py-1">
                    <BarcodeRenderer
                      value={generatedSku}
                      type={config.barcodeType}
                      height={40}
                      width={1.4}
                      fontSize={10}
                      displayValue={false}
                    />
                    <div className="font-mono font-bold text-[11px] tracking-wider text-neutral-900 mt-0.5">
                      {generatedSku}
                    </div>
                  </div>

                  <div className="text-[9px] text-neutral-400 border-t border-neutral-100 w-full pt-0.5">
                    * Tempel ke produk untuk scan kasir *
                  </div>
                </div>
              ) : itemsToPrint.length > 0 ? (
                itemsToPrint.map((item, idx) => {
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      style={cardStyle}
                      className="sku-print-card bg-white text-neutral-900 rounded-lg border border-dashed border-neutral-300 shadow-sm flex flex-col items-center justify-between text-center select-none shrink-0 transition-transform hover:scale-[1.02]"
                    >
                      {/* Store Name Header */}
                      {config.showStoreName && (
                        <div className="text-[9px] font-bold text-neutral-500 tracking-wider uppercase border-b border-neutral-100 w-full pb-0.5 truncate">
                          {storeSettings.storeName}
                        </div>
                      )}

                      {/* Product Name */}
                      {config.showProductName && (
                        <div className="text-[11px] font-bold text-neutral-900 leading-tight line-clamp-2 mt-1 px-1">
                          {item.name}
                        </div>
                      )}

                      {/* Barcode Render */}
                      <div className="w-full my-auto py-0.5 flex flex-col items-center justify-center">
                        <BarcodeRenderer
                          value={item.sku}
                          type={config.barcodeType}
                          height={config.paperSize === 'thermal_40x30' ? 34 : 42}
                          width={config.paperSize === 'thermal_40x30' ? 1.3 : 1.5}
                          fontSize={10}
                          displayValue={false}
                        />
                        {config.showSkuText && (
                          <span className="font-mono font-semibold text-[10px] tracking-wider text-neutral-800 mt-0.5 select-all">
                            {item.sku}
                          </span>
                        )}
                      </div>

                      {/* Price Section */}
                      {config.showPrice && item.price > 0 && (
                        <div className="w-full border-t border-neutral-200/80 pt-0.5 mt-0.5 flex items-center justify-center">
                          <span className="text-[12px] font-extrabold text-neutral-950 font-mono-numbers">
                            {formatRupiah(item.price)}
                          </span>
                        </div>
                      )}

                      {/* Action command subtext if cashier command */}
                      {'isAction' in item && (
                        <div className="w-full border-t border-emerald-200 pt-0.5 mt-0.5 text-[9px] text-emerald-800 font-bold">
                          {item.subtext}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-400 space-y-2">
                  <AlertCircle className="w-8 h-8 opacity-40" />
                  <p className="text-xs">Belum ada label produk yang dipilih untuk dicetak.</p>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
              <div className="text-xs text-neutral-500 shrink-0">
                Total Stiker:{' '}
                <strong className="text-neutral-900 dark:text-white font-mono">
                  {itemsToPrint.length} lembar
                </strong>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTap();
                    onClose();
                  }}
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Close' : 'Tutup'}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={itemsToPrint.length === 0}
                  className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    itemsToPrint.length > 0
                      ? 'bg-neutral-900 hover:bg-neutral-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95'
                      : 'bg-neutral-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">
                    {language === 'en' ? 'Print Labels' : 'Cetak Stiker Label'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Container dedicated for native browser window.print() */}
      <div id="sku-barcode-printable-area" className="hidden">
        {itemsToPrint.map((item, idx) => (
          <div
            key={`print-${item.id}-${idx}`}
            style={cardStyle}
            className="sku-print-card bg-white text-neutral-900 rounded-sm border border-neutral-300 flex flex-col items-center justify-between text-center"
          >
            {config.showStoreName && (
              <div className="text-[9px] font-bold text-neutral-600 tracking-wider uppercase border-b border-neutral-200 w-full pb-0.5 truncate">
                {storeSettings.storeName}
              </div>
            )}

            {config.showProductName && (
              <div className="text-[10px] font-bold text-neutral-900 leading-tight line-clamp-2 mt-0.5 px-0.5">
                {item.name}
              </div>
            )}

            <div className="w-full my-auto py-0.5 flex flex-col items-center justify-center">
              <BarcodeRenderer
                value={item.sku}
                type={config.barcodeType}
                height={config.paperSize === 'thermal_40x30' ? 32 : 40}
                width={config.paperSize === 'thermal_40x30' ? 1.3 : 1.5}
                fontSize={9}
                displayValue={false}
              />
              {config.showSkuText && (
                <span className="font-mono font-semibold text-[9.5px] tracking-wider text-neutral-800 mt-0.5">
                  {item.sku}
                </span>
              )}
            </div>

            {config.showPrice && item.price > 0 && (
              <div className="w-full border-t border-neutral-300 pt-0.5 mt-0.5 flex items-center justify-center">
                <span className="text-[11px] font-extrabold text-neutral-950 font-mono-numbers">
                  {formatRupiah(item.price)}
                </span>
              </div>
            )}

            {'isAction' in item && (
              <div className="w-full border-t border-neutral-300 pt-0.5 mt-0.5 text-[8.5px] text-neutral-900 font-bold">
                {item.subtext}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
