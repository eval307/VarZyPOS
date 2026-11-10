import React, { useState, useRef, useEffect } from 'react';
import {
  StoreSettings,
  PrinterDevice,
  ReceiptLayoutConfig,
  PrinterConnectionType,
  PaperWidth,
  Transaction,
  ReceiptTemplateId,
  ReceiptSectionKey,
  ReceiptBorderStyle,
  ReceiptFontFamily,
  ReceiptDensity,
} from '../types/pos';
import {
  Store,
  Printer,
  FileText,
  Sliders,
  Volume2,
  VolumeX,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Wifi,
  Usb,
  Bluetooth,
  Monitor,
  PrinterCheck,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Wrench,
  Layers,
  Sparkles,
  RefreshCw,
  Check,
  ChevronRight,
  Utensils,
  Sun,
  Moon,
  Languages,
  Palette,
  CheckCircle,
  Laptop,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { ReceiptPrint } from './ReceiptPrint';
import {
  RECEIPT_TEMPLATES,
  ALL_RECEIPT_SECTIONS,
  DEFAULT_SECTIONS_ORDER,
  sanitizeReceiptLayout,
  applyReceiptTemplate,
  createBlankReceiptConfig,
} from '../utils/receiptTemplates';
import {
  applyTheme,
  getStoredTheme,
  ThemeMode,
  ThemeAccent,
  BackgroundTheme,
  applyThemeAccent,
  applyBackgroundTheme,
  getStoredThemeAccent,
  getStoredBackgroundTheme,
  getStoredCustomBgUrl,
} from '../utils/theme';
import { compressAvatarFile } from '../utils/avatar';
import { AppLanguage } from '../utils/i18n';
import { useTranslation, getStoredLanguage } from '../context/LanguageContext';

interface SettingsViewProps {
  settings: StoreSettings;
  onSave: (newSettings: StoreSettings) => void;
  onResetData: () => void;
  onNavigateTab?: (tab: string) => void;
}

type SettingsTab = 'preferences' | 'profile' | 'receipt' | 'printers' | 'system';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSave,
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');
  const [receiptSubTab, setReceiptSubTab] = useState<'templates' | 'custom'>('templates');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState<StoreSettings>(() => ({
    ...settings,
    storeName: settings.storeName || 'VarzyPos',
    theme: getStoredTheme(),
    themeAccent: settings.themeAccent || getStoredThemeAccent(),
    backgroundTheme: settings.backgroundTheme || getStoredBackgroundTheme(),
    customBgUrl: settings.customBgUrl || getStoredCustomBgUrl(),
    language: getStoredLanguage(),
    soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : soundFx.enabled,
    receiptLayout: sanitizeReceiptLayout(settings.receiptLayout),
    printers:
      settings.printers && settings.printers.length > 0
        ? settings.printers
        : [
            {
              id: 'printer-1',
              name: 'Printer Kasir Utama (Thermal 80mm)',
              type: 'system',
              paperWidth: '80mm',
              isDefault: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'printer-2',
              name: 'Mobile Bluetooth POS (58mm)',
              type: 'bluetooth',
              paperWidth: '58mm',
              isDefault: false,
              createdAt: new Date().toISOString(),
            },
          ],
  }));

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        ...settings,
        storeName: settings.storeName || prev.storeName || 'VarzyPos',
        theme: settings.theme || getStoredTheme(),
        themeAccent: settings.themeAccent || prev.themeAccent || getStoredThemeAccent(),
        backgroundTheme: settings.backgroundTheme || prev.backgroundTheme || getStoredBackgroundTheme(),
        customBgUrl: settings.customBgUrl || prev.customBgUrl || getStoredCustomBgUrl(),
        language: settings.language || getStoredLanguage(),
        soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : soundFx.enabled,
        receiptLayout: sanitizeReceiptLayout(settings.receiptLayout || prev.receiptLayout),
        printers: settings.printers && settings.printers.length > 0 ? settings.printers : prev.printers,
      }));
    }
  }, [settings]);

  const { t, setLanguage: setGlobalLanguage } = useTranslation();

  const handleSelectTheme = (newTheme: ThemeMode) => {
    soundFx.playTap();
    setFormData((prev) => ({ ...prev, theme: newTheme }));
    applyTheme(newTheme, true);
    onSave({ ...formData, theme: newTheme });
  };

  const handleSelectThemeAccent = (newAccent: ThemeAccent) => {
    soundFx.playTap();
    setFormData((prev) => ({ ...prev, themeAccent: newAccent }));
    applyThemeAccent(newAccent, true);
    onSave({ ...formData, themeAccent: newAccent });
  };

  const handleSelectBackgroundTheme = (newBg: BackgroundTheme, customUrl?: string) => {
    soundFx.playTap();
    const url = customUrl !== undefined ? customUrl : (formData.customBgUrl || '');
    setFormData((prev) => ({ ...prev, backgroundTheme: newBg, customBgUrl: url }));
    applyBackgroundTheme(newBg, url, true);
    onSave({ ...formData, backgroundTheme: newBg, customBgUrl: url });
  };

  const handleSelectLanguage = (newLang: AppLanguage) => {
    soundFx.playTap();
    setFormData((prev) => ({ ...prev, language: newLang }));
    setGlobalLanguage(newLang);
    onSave({ ...formData, language: newLang });
  };

  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showAddPrinterModal, setShowAddPrinterModal] = useState(false);
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);

  // New/Edit Printer form state
  const [printerForm, setPrinterForm] = useState<Omit<PrinterDevice, 'id' | 'createdAt'>>({
    name: '',
    type: 'bluetooth',
    paperWidth: '58mm',
    ipAddress: '',
    isDefault: false,
  });

  // Test print trigger
  const [testPrintModal, setTestPrintModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample transaction for live preview and test print
  const sampleTransaction: Transaction = {
    id: 'sample-tx-001',
    invoiceNumber: 'INV-SAMPLE-01',
    timestamp: new Date().toISOString(),
    items: [
      {
        productId: 'sample-p1',
        name: 'Beras Pandan Wangi 5kg',
        sku: 'BRS-001',
        unit: 'karung',
        price: 74000,
        costPrice: 65000,
        quantity: 1,
        subtotal: 74000,
      },
      {
        productId: 'sample-p2',
        name: 'Minyak Goreng Bimoli 2L',
        sku: 'MYK-002',
        unit: 'pouch',
        price: 36500,
        costPrice: 32000,
        quantity: 2,
        subtotal: 73000,
      },
      {
        productId: 'sample-p3',
        name: 'Aqua Botol 600ml',
        sku: 'AQU-007',
        unit: 'botol',
        price: 4000,
        costPrice: 2800,
        quantity: 3,
        subtotal: 12000,
      },
    ],
    subtotal: 159000,
    discountAmount: 9000,
    taxAmount: formData.taxEnabled ? Math.round((150000 * (formData.taxRate || 11)) / 100) : 0,
    taxRate: formData.taxRate || 11,
    totalAmount: formData.taxEnabled
      ? 150000 + Math.round((150000 * (formData.taxRate || 11)) / 100)
      : 150000,
    totalCost: 137400,
    profit: 12600,
    paymentMethod: 'cash',
    cashGiven: 200000,
    change: formData.taxEnabled
      ? 200000 - (150000 + Math.round((150000 * (formData.taxRate || 11)) / 100))
      : 50000,
    cashierName: formData.cashierName || 'Kasir VarzyPos',
    customerName: 'Budi Santoso',
    status: 'completed',
  };

  // Reorder sections in receipt
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    soundFx.playTap();
    const currentOrder = [...(formData.receiptLayout.sectionsOrder || DEFAULT_SECTIONS_ORDER)];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIndex];
    currentOrder[targetIndex] = temp;

    setFormData((prev) => ({
      ...prev,
      receiptLayout: {
        ...prev.receiptLayout,
        templateId: 'custom',
        sectionsOrder: currentOrder,
      },
    }));
  };

  // Toggle visibility of a section
  const handleToggleSection = (sectionId: ReceiptSectionKey) => {
    soundFx.playTap();
    const hidden = [...(formData.receiptLayout.hiddenSections || [])];
    const isHidden = hidden.includes(sectionId);
    const updatedHidden = isHidden
      ? hidden.filter((id) => id !== sectionId)
      : [...hidden, sectionId];

    setFormData((prev) => ({
      ...prev,
      receiptLayout: {
        ...prev.receiptLayout,
        templateId: 'custom',
        hiddenSections: updatedHidden,
      },
    }));
  };

  // Apply a predefined template
  const handleApplyTemplate = (templateId: ReceiptTemplateId) => {
    soundFx.playTap();
    const updatedLayout = applyReceiptTemplate(templateId, formData.receiptLayout);
    setFormData((prev) => ({
      ...prev,
      receiptLayout: updatedLayout,
    }));
  };

  // Start completely from scratch (blank canvas mode)
  const handleStartFromScratch = () => {
    soundFx.playTap();
    const blank = createBlankReceiptConfig(formData.receiptLayout.paperWidth || '80mm');
    setFormData((prev) => ({
      ...prev,
      receiptLayout: blank,
    }));
    setReceiptSubTab('custom');
  };

  // Reset to default classic layout
  const handleResetReceiptToDefault = () => {
    soundFx.playTap();
    const classic = applyReceiptTemplate('classic', { paperWidth: formData.receiptLayout.paperWidth });
    setFormData((prev) => ({
      ...prev,
      receiptLayout: classic,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto terlalu besar. Maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.85);
          setFormData((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSavePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerForm.name.trim()) return;

    soundFx.playTap();
    if (editingPrinterId) {
      setFormData((prev) => {
        const updated = prev.printers.map((p) => {
          if (p.id === editingPrinterId) {
            return {
              ...p,
              ...printerForm,
            };
          }
          return printerForm.isDefault ? { ...p, isDefault: false } : p;
        });
        return { ...prev, printers: updated };
      });
    } else {
      const newPrinter: PrinterDevice = {
        id: 'printer-' + Date.now(),
        name: printerForm.name.trim(),
        type: printerForm.type,
        paperWidth: printerForm.paperWidth,
        ipAddress: printerForm.ipAddress?.trim() || '',
        isDefault: printerForm.isDefault || formData.printers.length === 0,
        createdAt: new Date().toISOString(),
      };

      setFormData((prev) => {
        const currentPrinters = newPrinter.isDefault
          ? prev.printers.map((p) => ({ ...p, isDefault: false }))
          : prev.printers;
        return {
          ...prev,
          printers: [...currentPrinters, newPrinter],
        };
      });
    }

    setShowAddPrinterModal(false);
    setEditingPrinterId(null);
    setPrinterForm({
      name: '',
      type: 'bluetooth',
      paperWidth: '58mm',
      ipAddress: '',
      isDefault: false,
    });
  };

  const handleSetDefaultPrinter = (printerId: string) => {
    soundFx.playTap();
    setFormData((prev) => {
      const target = prev.printers.find((p) => p.id === printerId);
      const updated = prev.printers.map((p) => ({
        ...p,
        isDefault: p.id === printerId,
      }));
      return {
        ...prev,
        printers: updated,
        receiptLayout: {
          ...prev.receiptLayout,
          paperWidth: target ? target.paperWidth : prev.receiptLayout.paperWidth,
        },
      };
    });
  };

  const handleDeletePrinter = (printerId: string) => {
    if (formData.printers.length <= 1) {
      alert('Minimal harus ada 1 printer yang terdaftar.');
      return;
    }
    soundFx.playTap();
    setFormData((prev) => {
      const remaining = prev.printers.filter((p) => p.id !== printerId);
      if (!remaining.some((p) => p.isDefault) && remaining.length > 0) {
        remaining[0].isDefault = true;
      }
      return { ...prev, printers: remaining };
    });
  };

  const handleOpenEditPrinter = (p: PrinterDevice) => {
    setEditingPrinterId(p.id);
    setPrinterForm({
      name: p.name,
      type: p.type,
      paperWidth: p.paperWidth,
      ipAddress: p.ipAddress || '',
      isDefault: p.isDefault,
    });
    setShowAddPrinterModal(true);
  };

  const handleSaveAll = () => {
    soundFx.playTap();
    if (formData.theme) {
      applyTheme(formData.theme, true);
    }
    if (formData.language) {
      setGlobalLanguage(formData.language);
    }
    onSave(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleResetConfirm = () => {
    soundFx.playTap();
    onResetData();
    setShowConfirmReset(false);
  };

  const getPrinterIcon = (type: PrinterConnectionType) => {
    switch (type) {
      case 'bluetooth':
        return <Bluetooth className="w-4 h-4 text-sky-600" />;
      case 'usb':
        return <Usb className="w-4 h-4 text-emerald-600" />;
      case 'network':
        return <Wifi className="w-4 h-4 text-indigo-600" />;
      case 'system':
      default:
        return <Monitor className="w-4 h-4 text-neutral-600" />;
    }
  };

  const getPrinterTypeName = (type: PrinterConnectionType) => {
    switch (type) {
      case 'bluetooth':
        return 'Bluetooth Thermal';
      case 'usb':
        return 'USB Thermal / Direct';
      case 'network':
        return 'Network (LAN / Wi-Fi)';
      case 'system':
      default:
        return 'System Driver / Browser';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Page Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                {t.settings.pageTitle}
              </h1>
              <span className="text-[10px] sm:text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {formData.storeName || 'VarzyPos'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t.settings.pageSubtitle}
            </p>
          </div>
        </div>

        {/* Header Action: Save Changes Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-pulse">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{t.settings.savedAlert}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t.settings.saveButton}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl px-2 sm:px-4 shadow-2xs overflow-x-auto scrollbar-none gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            setActiveTab('preferences');
          }}
          className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'preferences'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>{t.settings.tabPreferences}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            setActiveTab('receipt');
          }}
          className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'receipt'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t.settings.tabReceipt}</span>
          {formData.receiptLayout.templateId === 'custom' && (
            <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
              Kustom
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            setActiveTab('profile');
          }}
          className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{t.settings.tabProfile}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            setActiveTab('printers');
          }}
          className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'printers'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>{t.settings.tabPrinters}</span>
          <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold px-1.5 py-0.2 rounded-full">
            {formData.printers?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            setActiveTab('system');
          }}
          className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'system'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{t.settings.tabSystem}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs transition-colors">
        {/* ========================================================================= */}
        {/* TAB 1: PREFERENSI BAHASA & TEMA TAMPILAN (NEW)                             */}
        {/* ========================================================================= */}
        {activeTab === 'preferences' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* 1. Theme Configuration */}
            <div className="space-y-4">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-600" />
                  <span>{t.settings.themeTitle}</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {t.settings.themeSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme('light')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    formData.theme === 'light'
                      ? 'bg-emerald-50/80 dark:bg-neutral-800 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      <Sun className="w-5 h-5" />
                    </div>
                    {formData.theme === 'light' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {t.settings.themeLight}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                    {t.settings.themeLightDesc}
                  </p>
                  <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-white border border-neutral-300 shadow-2xs" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-neutral-400 ml-1">Terang & Kalem</span>
                  </div>
                </button>

                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme('dark')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    formData.theme === 'dark'
                      ? 'bg-emerald-50/80 dark:bg-neutral-800 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <Moon className="w-5 h-5" />
                    </div>
                    {formData.theme === 'dark' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {t.settings.themeDark}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                    {t.settings.themeDarkDesc}
                  </p>
                  <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-neutral-900 border border-neutral-700 shadow-2xs" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-neutral-400 ml-1">Redup & Elegan</span>
                  </div>
                </button>

                {/* System Mode Card */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme('system')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    formData.theme === 'system'
                      ? 'bg-emerald-50/80 dark:bg-neutral-800 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      <Laptop className="w-5 h-5" />
                    </div>
                    {formData.theme === 'system' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {t.settings.themeSystem}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                    {t.settings.themeSystemDesc}
                  </p>
                  <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-linear-to-r from-neutral-200 to-neutral-800" />
                    <span className="text-[10px] text-neutral-400 ml-1">Auto Sinkron</span>
                  </div>
                </button>
              </div>

              {/* 1.1 Theme Accent Color */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Warna Aksen Aplikasi</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Pilih warna aksen utama untuk tombol, badge, dan highlight di seluruh sistem
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {[
                    { id: 'emerald' as ThemeAccent, name: 'Emerald', hex: '#10b981', desc: 'Hijau POS' },
                    { id: 'indigo' as ThemeAccent, name: 'Indigo', hex: '#6366f1', desc: 'Modern & Tech' },
                    { id: 'violet' as ThemeAccent, name: 'Violet', hex: '#8b5cf6', desc: 'Elegan Mewah' },
                    { id: 'rose' as ThemeAccent, name: 'Rose', hex: '#f43f5e', desc: 'Hangat & Cantik' },
                    { id: 'amber' as ThemeAccent, name: 'Amber', hex: '#f59e0b', desc: 'Kafe & Resto' },
                    { id: 'slate' as ThemeAccent, name: 'Slate', hex: '#64748b', desc: 'Monokrom' },
                  ].map((accent) => {
                    const isSelected = (formData.themeAccent || 'emerald') === accent.id;
                    return (
                      <button
                        key={accent.id}
                        type="button"
                        onClick={() => handleSelectThemeAccent(accent.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-neutral-50 dark:bg-neutral-800 border-neutral-900 dark:border-white ring-2 ring-neutral-400/30 shadow-xs'
                            : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="w-5 h-5 rounded-full shadow-xs"
                            style={{ backgroundColor: accent.hex }}
                          />
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                            {accent.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {accent.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1.2 Background Styling */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-600" />
                    <span>Gaya Background Seluruh Halaman</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Terapkan warna latar, gradasi, pola dot grid, atau wallpaper gambar kustom ke seluruh halaman aplikasi
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'default' as BackgroundTheme, name: 'Minimalis Bersih', desc: 'Solid standar KasirKu', preview: 'bg-neutral-100 dark:bg-neutral-950' },
                    { id: 'slate' as BackgroundTheme, name: 'Slate Modern', desc: 'Sejuk dan profesional', preview: 'bg-slate-200 dark:bg-slate-900' },
                    { id: 'zinc' as BackgroundTheme, name: 'Zinc Monokrom', desc: 'Gelap pekat kontras', preview: 'bg-zinc-200 dark:bg-zinc-900' },
                    { id: 'warm' as BackgroundTheme, name: 'Warm Sand', desc: 'Nuansa hangat lembut', preview: 'bg-amber-100/70 dark:bg-stone-900' },
                    { id: 'cool' as BackgroundTheme, name: 'Cool Sky', desc: 'Nuansa biru es tenang', preview: 'bg-sky-100/70 dark:bg-slate-900' },
                    { id: 'mesh' as BackgroundTheme, name: 'Mesh Gradient', desc: 'Gradasi halus elegan', preview: 'bg-linear-to-tr from-emerald-100/70 via-indigo-100/60 to-rose-100/60 dark:from-emerald-950/40 dark:to-indigo-950/40' },
                    { id: 'dots' as BackgroundTheme, name: 'Dot Grid Pattern', desc: 'Pola titik modern', preview: 'bg-neutral-200/60 dark:bg-neutral-850' },
                    { id: 'custom' as BackgroundTheme, name: 'Custom Wallpaper', desc: 'Upload gambar sendiri', preview: 'bg-emerald-50 dark:bg-emerald-950/30' },
                  ].map((b) => {
                    const isSelected = (formData.backgroundTheme || 'default') === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBackgroundTheme(b.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-neutral-800 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <div className={`w-full h-12 rounded-lg ${b.preview} mb-2.5 border border-neutral-200/60 dark:border-neutral-700 flex items-center justify-center relative overflow-hidden`}>
                          {b.id === 'dots' && (
                            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(100, 116, 139, 0.4) 1.5px, transparent 1.5px)', backgroundSize: '10px 10px' }} />
                          )}
                          {b.id === 'custom' && formData.customBgUrl && (
                            <img src={formData.customBgUrl} alt="Custom" className="w-full h-full object-cover" />
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          {b.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Wallpaper Controls */}
                {formData.backgroundTheme === 'custom' && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        Gambar Wallpaper Kustom
                      </span>
                      {formData.customBgUrl && (
                        <button
                          type="button"
                          onClick={() => handleSelectBackgroundTheme('custom', '')}
                          className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus Wallpaper
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <label className="p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 rounded-xl text-center cursor-pointer transition-colors bg-white dark:bg-neutral-800 block">
                        <Upload className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                          Upload Gambar Wallpaper
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          Format JPG, PNG (Otomatis dioptimalkan)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64 = await compressAvatarFile(file, 1600, 250);
                                handleSelectBackgroundTheme('custom', base64);
                              } catch {
                                alert('Gagal memproses file wallpaper.');
                              }
                            }
                          }}
                        />
                      </label>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block">
                          Atau Masukkan URL Gambar Wallpaper:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            value={formData.customBgUrl || ''}
                            onChange={(e) => handleSelectBackgroundTheme('custom', e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Language Configuration */}
            <div className="space-y-4">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-emerald-600" />
                  <span>{t.settings.langTitle}</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {t.settings.langSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Indonesian */}
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('id')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    formData.language === 'id'
                      ? 'bg-emerald-50/80 dark:bg-neutral-800 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇮🇩</span>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {t.settings.langId}
                      </h4>
                    </div>
                    {formData.language === 'id' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    {t.settings.langIdDesc}
                  </p>
                </button>

                {/* English */}
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('en')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    formData.language === 'en'
                      ? 'bg-emerald-50/80 dark:bg-neutral-800 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇬🇧</span>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {t.settings.langEn}
                      </h4>
                    </div>
                    {formData.language === 'en' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    {t.settings.langEnDesc}
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FORMAT & TATA LETAK NOTA                                           */}
        {/* ========================================================================= */}
        {activeTab === 'receipt' && (
          <div className="space-y-4">
            {/* Sub-tab Switcher: Preset Templates vs Mode Kustom */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-100 dark:bg-neutral-800/80 p-2 sm:p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptSubTab('templates')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    receiptSubTab === 'templates'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 border border-neutral-200/80 dark:border-neutral-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Template Siap Pakai ({RECEIPT_TEMPLATES.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptSubTab('custom')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    receiptSubTab === 'custom'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 border border-neutral-200/80 dark:border-neutral-700'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>Mode Kustom (Tata Ulang Dari Nol)</span>
                  {formData.receiptLayout.templateId === 'custom' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              </div>

              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:flex items-center gap-1.5 px-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Perubahan langsung terlihat di pratinjau</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Controls (Templates or Custom) */}
              <div className="lg:col-span-6 space-y-4">
                {/* SUB-VIEW 1: PRESET TEMPLATES */}
                {receiptSubTab === 'templates' && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-100">
                      <p className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Pilih Template Desain Nota Kasir
                      </p>
                      <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 mt-0.5">
                        Pilih template yang paling sesuai dengan jenis toko Anda. Anda juga dapat beralih ke <strong>Mode Kustom</strong> untuk menata ulang tata letak nota mulai dari nol.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {RECEIPT_TEMPLATES.map((tmpl) => {
                        const isSelected = formData.receiptLayout.templateId === tmpl.id;
                        return (
                          <div
                            key={tmpl.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{tmpl.name}</h4>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}
                                  >
                                    {tmpl.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{tmpl.tagline}</p>
                              </div>

                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md shrink-0">
                                Rekomendasi: {tmpl.recommendedPaper}
                              </span>
                            </div>

                            <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed mb-3">
                              {tmpl.description}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                              <button
                                type="button"
                                onClick={() => handleApplyTemplate(tmpl.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-neutral-900 text-white dark:bg-neutral-700 dark:hover:bg-neutral-600 hover:bg-neutral-800'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Sedang Digunakan</span>
                                  </>
                                ) : (
                                  <span>Terapkan Template</span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleApplyTemplate(tmpl.id);
                                  setReceiptSubTab('custom');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-emerald-700 p-1 cursor-pointer"
                              >
                                <span>Sesuaikan di Mode Kustom</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 2: CUSTOM LAYOUT MODE (FROM SCRATCH) */}
                {receiptSubTab === 'custom' && (
                  <div className="space-y-4">
                    {/* Custom Mode Header & Quick Actions */}
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/90 dark:border-amber-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-amber-600" />
                          Mode Kustom Tata Letak
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-md">
                          Bebas Ditata
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                        Anda dapat menata ulang urutan blok nota, menyembunyikan/menampilkan seksi, memilih gaya garis, font, dan mengatur format mulai dari kanvas kosong.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800">
                        <button
                          type="button"
                          onClick={handleStartFromScratch}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-amber-950 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-800" />
                          <span>Mulai Dari Nol (Kanvas Kosong)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetReceiptToDefault}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-neutral-500" />
                          <span>Reset ke Klasik</span>
                        </button>
                      </div>
                    </div>

                    {/* SECTION REORDERING & VISIBILITY */}
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          Urutan & Tampilan Blok Nota
                        </h4>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Geser urutan dengan tombol ▲ dan ▼, klik mata untuk toggle tampil/sembunyi
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        {(formData.receiptLayout.sectionsOrder || DEFAULT_SECTIONS_ORDER).map((secKey, idx, arr) => {
                          const meta = ALL_RECEIPT_SECTIONS.find((s) => s.id === secKey);
                          if (!meta) return null;
                          const isHidden = (formData.receiptLayout.hiddenSections || []).includes(secKey);

                          return (
                            <div
                              key={secKey}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                isHidden
                                  ? 'bg-neutral-100/70 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-2xs text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    isHidden
                                      ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-xs font-semibold truncate ${
                                        isHidden ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
                                      }`}
                                    >
                                      {meta.label}
                                    </span>
                                    {isHidden && (
                                      <span className="text-[9px] px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                                        Disembunyikan
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{meta.description}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveSection(idx, 'up')}
                                  className="p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                                  title="Geser ke Atas"
                                >
                                  <ArrowUp className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === arr.length - 1}
                                  onClick={() => handleMoveSection(idx, 'down')}
                                  className="p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                                  title="Geser ke Bawah"
                                >
                                  <ArrowDown className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-200" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSection(secKey)}
                                  className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                                    isHidden
                                      ? 'bg-neutral-100 dark:bg-neutral-700 border-neutral-300 text-neutral-400'
                                      : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                                  }`}
                                  title={isHidden ? 'Tampilkan Blok Ini' : 'Sembunyikan Blok Ini'}
                                >
                                  {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PAPER WIDTH */}
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                      <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        Ukuran Lebar Kertas Thermal
                      </label>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              receiptLayout: { ...prev.receiptLayout, paperWidth: '58mm', templateId: 'custom' },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            formData.receiptLayout.paperWidth === '58mm'
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-500/20'
                              : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">58 mm</div>
                          <div className="text-[10px] text-neutral-500">Mini Portable</div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              receiptLayout: { ...prev.receiptLayout, paperWidth: '80mm', templateId: 'custom' },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            formData.receiptLayout.paperWidth === '80mm'
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-500/20'
                              : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">80 mm</div>
                          <div className="text-[10px] text-neutral-500">Standar POS</div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              receiptLayout: { ...prev.receiptLayout, paperWidth: '100mm', templateId: 'custom' },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            formData.receiptLayout.paperWidth === '100mm'
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-500/20'
                              : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">100 mm</div>
                          <div className="text-[10px] text-neutral-500">Invoice Lebar</div>
                        </button>
                      </div>
                    </div>

                    {/* TYPOGRAPHY & STYLING */}
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <span className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        Gaya Visual & Tipografi
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Garis Pemisah (Divider)
                          </label>
                          <select
                            value={formData.receiptLayout.borderStyle || 'dashed'}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: {
                                  ...prev.receiptLayout,
                                  templateId: 'custom',
                                  borderStyle: e.target.value as ReceiptBorderStyle,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="dashed">Garis Putus-putus (Dashed)</option>
                            <option value="dotted">Garis Titik-titik (Dotted)</option>
                            <option value="solid">Garis Lurus Solid (Solid)</option>
                            <option value="double">Garis Ganda (Double Line)</option>
                            <option value="none">Tanpa Garis Pemisah (None)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Jenis Huruf (Font Family)
                          </label>
                          <select
                            value={formData.receiptLayout.fontFamily || 'mono'}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: {
                                  ...prev.receiptLayout,
                                  templateId: 'custom',
                                  fontFamily: e.target.value as ReceiptFontFamily,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="mono">Monospace Kasir (Otentik)</option>
                            <option value="sans">Clean Modern Sans-Serif</option>
                            <option value="serif">Klasik Elegan Serif</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Ukuran Huruf (Font Size)
                          </label>
                          <select
                            value={formData.receiptLayout.fontSize || 'normal'}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: {
                                  ...prev.receiptLayout,
                                  templateId: 'custom',
                                  fontSize: e.target.value as 'compact' | 'normal' | 'large',
                                },
                              }))
                            }
                            className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="compact">Ringkas / Kecil (Hemat Kertas)</option>
                            <option value="normal">Normal (Rekomendasi)</option>
                            <option value="large">Besar / Sangat Jelas</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Perataan Header Toko
                          </label>
                          <select
                            value={formData.receiptLayout.headerAlign || 'center'}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: {
                                  ...prev.receiptLayout,
                                  templateId: 'custom',
                                  headerAlign: e.target.value as 'center' | 'left' | 'right',
                                },
                              }))
                            }
                            className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="center">Rata Tengah (Center)</option>
                            <option value="left">Rata Kiri (Left)</option>
                            <option value="right">Rata Kanan (Right)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* DETAIL CHECKBOXES */}
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                      <span className="block text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        Detail Elemen Mikro
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                        <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <input
                            type="checkbox"
                            checked={formData.receiptLayout.showLogo}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: { ...prev.receiptLayout, showLogo: e.target.checked, templateId: 'custom' },
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span>Logo Toko</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <input
                            type="checkbox"
                            checked={formData.receiptLayout.showCashier}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: { ...prev.receiptLayout, showCashier: e.target.checked, templateId: 'custom' },
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span>Nama Kasir</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <input
                            type="checkbox"
                            checked={formData.receiptLayout.showCustomer}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: { ...prev.receiptLayout, showCustomer: e.target.checked, templateId: 'custom' },
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span>Nama Pelanggan</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <input
                            type="checkbox"
                            checked={formData.receiptLayout.showBarcode}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                receiptLayout: { ...prev.receiptLayout, showBarcode: e.target.checked, templateId: 'custom' },
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span>Barcode Struk</span>
                        </label>
                      </div>
                    </div>

                    {/* CUSTOM NOTES */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          Teks Badge Meja / No. Antrean (F&B)
                        </label>
                        <input
                          type="text"
                          value={formData.receiptLayout.orderBadgeText || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              receiptLayout: {
                                ...prev.receiptLayout,
                                orderBadgeText: e.target.value,
                                templateId: 'custom',
                              },
                            }))
                          }
                          placeholder="Contoh: MEJA 04 · DINE IN atau NO. ANTREAN #12"
                          className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                          Catatan Khusus / Promo / WiFi
                        </label>
                        <input
                          type="text"
                          value={formData.receiptLayout.customNotes || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              receiptLayout: {
                                ...prev.receiptLayout,
                                customNotes: e.target.value,
                                templateId: 'custom',
                              },
                            }))
                          }
                          placeholder="Contoh: WiFi: KedaiKopi | Sandi: ngopiyuk123"
                          className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Interactive Receipt Preview */}
              <div className="lg:col-span-6 bg-neutral-100 dark:bg-neutral-800/80 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col items-center sticky top-4">
                <div className="w-full flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Pratinjau Langsung Nota</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Instant Paper Switcher in Preview */}
                    <div className="flex items-center bg-white dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            receiptLayout: { ...prev.receiptLayout, paperWidth: '58mm' },
                          }))
                        }
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                          formData.receiptLayout.paperWidth === '58mm'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        58mm
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            receiptLayout: { ...prev.receiptLayout, paperWidth: '80mm' },
                          }))
                        }
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                          formData.receiptLayout.paperWidth === '80mm'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        80mm
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            receiptLayout: { ...prev.receiptLayout, paperWidth: '100mm' },
                          }))
                        }
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                          formData.receiptLayout.paperWidth === '100mm'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        100mm
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTestPrintModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shadow-2xs cursor-pointer"
                    >
                      <PrinterCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Uji Cetak</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-[660px] overflow-y-auto overflow-x-hidden w-full flex justify-center items-start py-4 px-2 sm:px-3 bg-neutral-200/70 dark:bg-neutral-900/60 rounded-2xl border border-neutral-300/80 dark:border-neutral-700 shadow-inner">
                  <div className="w-full flex justify-center items-start">
                    <ReceiptPrint
                      transaction={sampleTransaction}
                      storeSettings={formData}
                      customLayout={formData.receiptLayout}
                      showModalControls={false}
                    />
                  </div>
                </div>

                <div className="w-full flex items-center justify-between text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-2.5 px-1">
                  <span>
                    Template: <strong className="text-neutral-800 dark:text-neutral-200 capitalize">{formData.receiptLayout.templateId || 'Standar'}</strong>
                  </span>
                  <span>
                    Lebar: <strong className="text-neutral-800 dark:text-neutral-200">{formData.receiptLayout.paperWidth}</strong>
                  </span>
                  <span>
                    Seksi Aktif:{' '}
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {
                        (formData.receiptLayout.sectionsOrder || DEFAULT_SECTIONS_ORDER).filter(
                          (s) => !(formData.receiptLayout.hiddenSections || []).includes(s)
                        ).length
                      }
                      /9
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROFIL TOKO & LOGO                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Foto Profil / Logo Toko */}
            <div className="p-4 sm:p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <label className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Foto Profil / Logo Toko
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Toko"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-neutral-400" />
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="upload-store-logo-view"
                    />
                    <label
                      htmlFor="upload-store-logo-view"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formData.logoUrl ? 'Ganti Foto' : 'Unggah Logo'}</span>
                    </label>

                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Format PNG, JPG, atau WebP maks 2MB. Logo akan tercetak otomatis pada struk nota dan sidebar.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Input Detail Toko */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Nama Toko / Usaha *
                </label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="Contoh: Varzy Coffee & Resto"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Slogan / Tagline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Contoh: Freshly Brewed Every Day"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812-3456-7890"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Nama Kasir Standar
                </label>
                <input
                  type="text"
                  value={formData.cashierName}
                  onChange={(e) => setFormData({ ...formData, cashierName: e.target.value })}
                  placeholder="Kasir 01"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Alamat Lengkap Toko
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Merdeka Raya No. 45, Jakarta"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Pesan Footer Nota Standar
                </label>
                <textarea
                  rows={2}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="Terima kasih atas kunjungan Anda! Barang yang dibeli tidak dapat ditukar."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MANAJEMEN PRINTER                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'printers' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Daftar Printer Kasir Terhubung
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Tambahkan dan atur printer thermal Bluetooth, USB, atau Jaringan (LAN)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPrinterId(null);
                  setPrinterForm({
                    name: '',
                    type: 'bluetooth',
                    paperWidth: '58mm',
                    ipAddress: '',
                    isDefault: false,
                  });
                  setShowAddPrinterModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Printer</span>
              </button>
            </div>

            {/* Printer List Cards */}
            <div className="space-y-3">
              {formData.printers.map((printer) => (
                <div
                  key={printer.id}
                  className={`p-4 rounded-xl border transition-all ${
                    printer.isDefault
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 ring-1 ring-emerald-400/50'
                      : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-2xs">
                        {getPrinterIcon(printer.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {printer.name}
                          </h5>
                          {printer.isDefault && (
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.2 rounded-full">
                              Default Kasir
                            </span>
                          )}
                          <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold px-2 py-0.2 rounded-full">
                            {printer.paperWidth}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Tipe: <span className="font-medium text-neutral-800 dark:text-neutral-200">{getPrinterTypeName(printer.type)}</span>
                          {printer.ipAddress && ` · IP: ${printer.ipAddress}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!printer.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultPrinter(printer.id)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-emerald-700 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                        >
                          Jadikan Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditPrinter(printer)}
                        className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit Konfigurasi"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePrinter(printer.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Printer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Print Test Card */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Uji Coba Cetak ke Printer</h5>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Cetak lembar uji coba transaksi untuk memastikan ukuran dan koneksi mesin printer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTestPrintModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Uji</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SISTEM & DATA                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Opsi Pajak */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Pajak Penjualan (PPN)
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Tambahkan persentase pajak secara otomatis pada setiap transaksi kasir
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.taxEnabled}
                    onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {formData.taxEnabled && (
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Tarif Pajak:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                    className="w-20 px-2.5 py-1 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg text-center font-bold dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-300 font-bold">% (Standar PPN 11%)</span>
                </div>
              )}
            </div>

            {/* Opsi Audio */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  {formData.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-400" />
                  )}
                  Efek Suara Kasir (Scanner Beep & Success Chime)
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Bunyi bip saat scan barang dan nada ketika pembayaran transaksi berhasil
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !formData.soundEnabled;
                  setFormData({ ...formData, soundEnabled: nextVal });
                  soundFx.enabled = nextVal;
                  try {
                    localStorage.setItem('kasirku_sound_enabled', JSON.stringify(nextVal));
                  } catch {}
                  if (nextVal) soundFx.playScanBeep();
                  onSave({ ...formData, soundEnabled: nextVal });
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  formData.soundEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                }`}
              >
                {formData.soundEnabled ? 'Aktif' : 'Mati'}
              </button>
            </div>

            {/* Reset Database Section */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              {!showConfirmReset ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="w-full py-2.5 px-3 text-xs text-neutral-600 dark:text-neutral-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-neutral-300 dark:border-neutral-700 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Kosongkan Seluruh Data Toko (Reset ke Nol)</span>
                </button>
              ) : (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Konfirmasi Reset Data Toko
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    Tindakan ini akan menghapus seluruh produk, transaksi, dan riwayat di toko ini secara permanen dan memulai toko dari nol.
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    Tindakan ini akan mengembalikan daftar produk dan stok ke data contoh bawaan. Riwayat transaksi sebelumnya akan direset.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResetConfirm}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
                    >
                      Ya, Reset Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmReset(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Modal: Add / Edit Printer */}
      {showAddPrinterModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {editingPrinterId ? 'Edit Printer Kasir' : 'Tambah Printer Baru'}
            </h4>

            <form onSubmit={handleSavePrinter} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nama Perangkat Printer *
                </label>
                <input
                  type="text"
                  required
                  value={printerForm.name}
                  onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                  placeholder="Contoh: Thermal Kasir 80mm"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Tipe Koneksi
                  </label>
                  <select
                    value={printerForm.type}
                    onChange={(e) =>
                      setPrinterForm({
                        ...printerForm,
                        type: e.target.value as PrinterConnectionType,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="bluetooth">Bluetooth</option>
                    <option value="usb">USB Direct</option>
                    <option value="network">Network (LAN / Wi-Fi)</option>
                    <option value="system">System Driver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Ukuran Kertas
                  </label>
                  <select
                    value={printerForm.paperWidth}
                    onChange={(e) =>
                      setPrinterForm({
                        ...printerForm,
                        paperWidth: e.target.value as PaperWidth,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="58mm">58 mm (Mini)</option>
                    <option value="80mm">80 mm (Standar)</option>
                    <option value="100mm">100 mm (Lebar)</option>
                  </select>
                </div>
              </div>

              {printerForm.type === 'network' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    IP Address Printer
                  </label>
                  <input
                    type="text"
                    value={printerForm.ipAddress}
                    onChange={(e) => setPrinterForm({ ...printerForm, ipAddress: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg dark:bg-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printerForm.isDefault}
                  onChange={(e) => setPrinterForm({ ...printerForm, isDefault: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Jadikan Printer Default Kasir</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddPrinterModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan Printer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Receipt Print Preview Modal for Testing */}
      {testPrintModal && (
        <ReceiptPrint
          transaction={sampleTransaction}
          storeSettings={formData}
          customLayout={formData.receiptLayout}
          showModalControls={true}
          onClose={() => setTestPrintModal(false)}
        />
      )}
    </div>
  );
};
