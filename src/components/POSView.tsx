import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, CartItem, Transaction, StoreSettings, PaymentMethod, Category } from '../types/pos';
import { formatRupiah, generateInvoiceNumber } from '../utils/format';
import { soundFx } from '../utils/audio';
import { getStoreStorage, setStoreStorage, removeStoreStorage } from '../utils/storage';
import { useTranslation } from '../context/LanguageContext';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  X,
  AlertCircle,
  Percent,
  Sparkles,
  Package,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  LayoutGrid,
  LayoutList,
  Zap,
} from 'lucide-react';
import { SkuBarcodeModal } from './SkuBarcodeModal';

interface POSViewProps {
  products: Product[];
  categories: Category[];
  storeSettings: StoreSettings;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onCompleteTransaction: (transaction: Transaction) => void;
  onViewReceipt: (transaction: Transaction) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories: managedCategories,
  storeSettings,
  cart,
  setCart,
  onCompleteTransaction,
  onViewReceipt,
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [customerName, setCustomerName] = useState(() =>
    getStoreStorage(storeSettings.storeName || 'default', 'pos_customer', '')
  );
  const [cartDiscountPercent, setCartDiscountPercent] = useState<number>(() =>
    getStoreStorage(storeSettings.storeName || 'default', 'pos_discount', 0)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'list'>('grid');

  // Express Scan-to-Payment Mode: Scan barcode directly adds item & opens payment step
  const [expressCheckoutOnScan, setExpressCheckoutOnScan] = useState<boolean>(() =>
    getStoreStorage(storeSettings.storeName || 'default', 'pos_express_scan', false)
  );
  const [isSkuModalOpen, setIsSkuModalOpen] = useState(false);

  useEffect(() => {
    setStoreStorage(storeSettings.storeName || 'default', 'pos_express_scan', expressCheckoutOnScan);
  }, [storeSettings.storeName, expressCheckoutOnScan]);
  const [scanSuccessToast, setScanSuccessToast] = useState<{
    product: Product;
    timestamp: number;
  } | null>(null);

  const triggerScanSuccess = (product: Product) => {
    setScanSuccessToast({
      product,
      timestamp: Date.now(),
    });
  };

  useEffect(() => {
    if (scanSuccessToast) {
      const timer = setTimeout(() => {
        setScanSuccessToast(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scanSuccessToast]);

  useEffect(() => {
    setStoreStorage(storeSettings.storeName || 'default', 'pos_customer', customerName);
  }, [storeSettings.storeName, customerName]);

  useEffect(() => {
    setStoreStorage(storeSettings.storeName || 'default', 'pos_discount', cartDiscountPercent);
  }, [storeSettings.storeName, cartDiscountPercent]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Extract categories dynamically from managedCategories
  const categories = useMemo(() => {
    if (managedCategories && managedCategories.length > 0) {
      return ['Semua', ...managedCategories.map((c) => c.name)];
    }
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ['Semua', ...cats];
  }, [managedCategories, products]);

  // Instant matches by name or code (SKU)
  const instantMatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter((p) => {
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        return matchName || matchSku;
      })
      .slice(0, 6);
  }, [products, searchQuery]);

  // Click outside search container handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter products by category and query
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
      return matchCategory && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Clear error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Calculate cart totals
  const { subtotal, discountAmount, taxAmount, totalAmount, totalCost } = useMemo(() => {
    const rawSubtotal = cart.reduce((acc, item) => {
      const itemPrice = item.product.price;
      const itemDisc = (itemPrice * (item.discountPercent || 0)) / 100;
      return acc + (itemPrice - itemDisc) * item.quantity;
    }, 0);

    const rawCost = cart.reduce((acc, item) => {
      return acc + item.product.costPrice * item.quantity;
    }, 0);

    const overallDiscount = (rawSubtotal * cartDiscountPercent) / 100;
    const discountedSubtotal = Math.max(0, rawSubtotal - overallDiscount);

    const tax = storeSettings.taxEnabled
      ? (discountedSubtotal * storeSettings.taxRate) / 100
      : 0;

    const total = discountedSubtotal + tax;

    return {
      subtotal: rawSubtotal,
      discountAmount: overallDiscount,
      taxAmount: tax,
      totalAmount: total,
      totalCost: rawCost,
    };
  }, [cart, cartDiscountPercent, storeSettings]);

  // Find product by SKU, ID, Name, or Barcode
  const findProductByCode = (rawCode: string): Product | undefined => {
    const code = rawCode.replace(/[\r\n\t]/g, '').trim();
    if (!code) return undefined;
    const cleanCode = code.toLowerCase();

    // 1. Exact match on SKU (trimmed, case-insensitive)
    const bySku = products.find(
      (p) => p.sku && p.sku.trim().toLowerCase() === cleanCode
    );
    if (bySku) return bySku;

    // 2. Exact match on ID
    const byId = products.find(
      (p) => p.id && p.id.trim().toLowerCase() === cleanCode
    );
    if (byId) return byId;

    // 3. Exact match on Name
    const byName = products.find(
      (p) => p.name && p.name.trim().toLowerCase() === cleanCode
    );
    if (byName) return byName;

    // 4. Strip leading zeros for EAN/UPC scanners
    const unpadded = cleanCode.replace(/^0+/, '');
    if (unpadded && unpadded !== cleanCode) {
      const byUnpadded = products.find(
        (p) => p.sku && p.sku.trim().toLowerCase().replace(/^0+/, '') === unpadded
      );
      if (byUnpadded) return byUnpadded;
    }

    return undefined;
  };

  // Add item to cart with safe state updater, scan beep & success banner
  const addToCart = (product: Product, triggerCheckout?: boolean): boolean => {
    if (product.stock <= 0) {
      soundFx.playWarning();
      setErrorMessage(
        language === 'en'
          ? `Product "${product.name}" is out of stock!`
          : `Stok barang "${product.name}" sudah habis!`
      );
      return false;
    }

    const shouldCheckout = triggerCheckout !== undefined ? triggerCheckout : expressCheckoutOnScan;

    let addedSuccessfully = true;
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);

      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty >= product.stock) {
          addedSuccessfully = false;
          soundFx.playWarning();
          setErrorMessage(
            language === 'en'
              ? `Quantity cannot exceed available stock (${product.stock} ${product.unit})!`
              : `Jumlah tidak dapat melebihi stok yang tersedia (${product.stock} ${product.unit})!`
          );
          return prevCart;
        }

        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + 1,
        };
        return updated;
      } else {
        return [...prevCart, { product, quantity: 1, discountPercent: 0 }];
      }
    });

    if (addedSuccessfully) {
      soundFx.playScanBeep();
      triggerScanSuccess(product);
      setErrorMessage(null);

      // If Express Scan Mode is active: Fast forward immediately into Payment Step!
      if (shouldCheckout) {
        setTimeout(() => {
          soundFx.playTap();
          setPaymentMethod('cash');
          setShowCheckoutModal(true);
        }, 50);
      }

      return true;
    }
    return false;
  };

  // Process cashier command barcodes (e.g. CMD-PAY, CMD-CASH, CMD-CLEAR)
  const handleActionCommand = (rawCode: string): boolean => {
    const upper = rawCode.trim().toUpperCase();
    if (upper === 'CMD-PAY' || upper === 'BAYAR' || upper === 'PAY') {
      if (cart.length > 0) {
        soundFx.playTap();
        setPaymentMethod('cash');
        setCashGiven(totalAmount);
        setShowCheckoutModal(true);
        setErrorMessage(null);
        return true;
      } else {
        soundFx.playWarning();
        setErrorMessage(language === 'en' ? 'Cart is empty!' : 'Keranjang masih kosong!');
        return true;
      }
    }

    if (upper === 'CMD-CASH' || upper === 'TUNAI') {
      if (cart.length > 0) {
        soundFx.playTap();
        setPaymentMethod('cash');
        setCashGiven(totalAmount);
        setShowCheckoutModal(true);
        setErrorMessage(null);
        return true;
      }
    }

    if (upper === 'CMD-CLEAR' || upper === 'BATAL' || upper === 'RESET') {
      clearCart();
      setErrorMessage(null);
      return true;
    }

    return false;
  };

  // Modify item quantity
  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > product.stock) {
              soundFx.playWarning();
              setErrorMessage(
                language === 'en'
                  ? `Only ${product.stock} ${product.unit} available in stock!`
                  : `Stok hanya tersedia ${product.stock} ${product.unit}!`
              );
              return item;
            }
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
    soundFx.playTap();
  };

  // Set explicit quantity
  const setExactQuantity = (productId: string, val: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const targetQty = isNaN(val) ? 1 : Math.max(1, Math.min(val, product.stock));
    if (val > product.stock) {
      soundFx.playWarning();
      setErrorMessage(
        language === 'en'
          ? `Only ${product.stock} ${product.unit} available in stock!`
          : `Stok hanya tersedia ${product.stock} ${product.unit}!`
      );
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: targetQty } : item
      )
    );
  };

  // Remove item from cart
  const removeFromCart = (productId: string) => {
    soundFx.playTap();
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    if (cart.length === 0) return;
    soundFx.playTap();
    setCart([]);
    setCartDiscountPercent(0);
    setCustomerName('');
    removeStoreStorage(storeSettings.storeName || 'default', 'pos_customer');
    removeStoreStorage(storeSettings.storeName || 'default', 'pos_discount');
  };

  // Handle instant search enter submit
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // 1. Search exact SKU / ID / Name first
    if (handleActionCommand(query)) {
      setSearchQuery('');
      setIsSearchFocused(false);
      return;
    }

    const matched = findProductByCode(query);
    if (matched) {
      const added = addToCart(matched, expressCheckoutOnScan);
      if (added) {
        setSearchQuery('');
        setIsSearchFocused(false);
        setErrorMessage(null);
        return;
      }
    }

    // 2. Take the top instant match
    if (instantMatches.length > 0) {
      const added = addToCart(instantMatches[0], expressCheckoutOnScan);
      if (added) {
        setSearchQuery('');
        setIsSearchFocused(false);
        setErrorMessage(null);
      }
    } else {
      soundFx.playWarning();
      setErrorMessage(
        language === 'en'
          ? `Product with SKU or name "${query}" not found!`
          : `Barang dengan nama atau SKU "${query}" tidak ditemukan!`
      );
    }
  };

  // Handle barcode input change with instant auto-add on match!
  const handleBarcodeInput = (val: string) => {
    setBarcodeInput(val);
    const clean = val.replace(/[\r\n\t]/g, '').trim();
    if (!clean || clean.length < 2) return;

    if (handleActionCommand(clean)) {
      setBarcodeInput('');
      return;
    }

    // As soon as the input matches an exact SKU, immediately add to cart!
    const matched = findProductByCode(clean);
    if (matched) {
      const added = addToCart(matched, expressCheckoutOnScan);
      if (added) {
        setBarcodeInput('');
        setErrorMessage(null);
      }
    }
  };

  // Handle barcode scanner form submit
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = barcodeInput.replace(/[\r\n\t]/g, '').trim();
    if (!clean) return;

    if (handleActionCommand(clean)) {
      setBarcodeInput('');
      return;
    }

    const matched = findProductByCode(clean);
    if (matched) {
      const added = addToCart(matched, expressCheckoutOnScan);
      if (added) {
        setBarcodeInput('');
        setErrorMessage(null);
      }
    } else {
      soundFx.playWarning();
      setErrorMessage(
        language === 'en'
          ? `Barcode / SKU "${clean}" not found in catalog!`
          : `Barcode / Kode SKU "${clean}" tidak ditemukan!`
      );
    }
  };

  // Global Hardware Barcode Scanner & Shortcut listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes search dropdown
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        return;
      }

      const activeEl = document.activeElement;
      const isInputActive =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;

      // '/' to focus search when not in any input
      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
        return;
      }

      // If user is typing in dedicated barcode input, its native onChange/onSubmit will handle it
      if (activeEl === barcodeInputRef.current) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      // If user is slowly typing inside a normal text field (e.g. customer name or note), do not intercept
      if (isInputActive && timeDiff > 100) {
        buffer = '';
        return;
      }

      // If more than 220ms elapsed between keystrokes when not in input, reset buffer
      if (timeDiff > 220) {
        buffer = '';
      }

      if (timer) clearTimeout(timer);

      if (e.key === 'Enter') {
        const code = buffer.trim();
        buffer = '';
        if (code.length >= 2) {
          if (handleActionCommand(code)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          const matched = findProductByCode(code);
          if (matched) {
            e.preventDefault();
            e.stopPropagation();
            addToCart(matched, expressCheckoutOnScan);
            setErrorMessage(null);
          } else if (!isInputActive) {
            soundFx.playWarning();
            setErrorMessage(
              language === 'en'
                ? `Barcode SKU "${code}" not found in catalog!`
                : `Barcode / SKU "${code}" tidak ditemukan di katalog!`
            );
          }
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!isInputActive) {
          buffer += e.key;

          // For scanners that do not emit Enter: auto-add after 120ms debounce if buffer matches exact SKU
          timer = setTimeout(() => {
            const candidate = buffer.trim();
            if (candidate.length >= 2) {
              if (handleActionCommand(candidate)) {
                buffer = '';
                return;
              }

              const matched = findProductByCode(candidate);
              if (matched) {
                addToCart(matched, expressCheckoutOnScan);
                buffer = '';
                setErrorMessage(null);
              }
            }
          }, 120);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [products, language, expressCheckoutOnScan, cart]);

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    soundFx.playTap();
    setPaymentMethod('cash');
    setCashGiven(totalAmount); // Default to exact amount
    setShowCheckoutModal(true);
  };

  // Auto-sync cashGiven whenever checkout modal opens with positive totalAmount
  useEffect(() => {
    if (showCheckoutModal && totalAmount > 0) {
      setCashGiven((prev) => (prev <= 0 || prev < totalAmount ? totalAmount : prev));
    }
  }, [showCheckoutModal, totalAmount]);

  // Process transaction
  const handleProcessTransaction = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'cash' && cashGiven < totalAmount) {
      soundFx.playWarning();
      setErrorMessage('Nominal pembayaran tunai kurang dari total belanja!');
      return;
    }

    const transaction: Transaction = {
      id: 'trx-' + Date.now(),
      invoiceNumber: generateInvoiceNumber(),
      timestamp: new Date().toISOString(),
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        unit: item.product.unit,
        price: item.product.price,
        costPrice: item.product.costPrice,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
      })),
      subtotal,
      discountAmount,
      taxAmount,
      taxRate: storeSettings.taxEnabled ? storeSettings.taxRate : 0,
      totalAmount,
      totalCost,
      profit: totalAmount - totalCost - taxAmount,
      paymentMethod,
      cashGiven: paymentMethod === 'cash' ? cashGiven : totalAmount,
      change: paymentMethod === 'cash' ? Math.max(0, cashGiven - totalAmount) : 0,
      cashierName: storeSettings.cashierName,
      customerName: customerName.trim() || undefined,
      status: 'completed',
    };

    soundFx.playSuccessChime();
    onCompleteTransaction(transaction);
    setShowCheckoutModal(false);
    setCart([]);
    setCustomerName('');
    setCartDiscountPercent(0);
    removeStoreStorage(storeSettings.storeName || 'default', 'pos_customer');
    removeStoreStorage(storeSettings.storeName || 'default', 'pos_discount');
    onViewReceipt(transaction);
  };

  // Quick cash amounts
  const getQuickCashSuggestions = (total: number) => {
    const suggestions = [total];
    const roundedUp10k = Math.ceil(total / 10000) * 10000;
    const roundedUp20k = Math.ceil(total / 20000) * 20000;
    const roundedUp50k = Math.ceil(total / 50000) * 50000;
    const roundedUp100k = Math.ceil(total / 100000) * 100000;

    [roundedUp10k, roundedUp20k, roundedUp50k, roundedUp100k].forEach((val) => {
      if (val > total && !suggestions.includes(val)) {
        suggestions.push(val);
      }
    });

    if (!suggestions.includes(50000) && total <= 50000) suggestions.push(50000);
    if (!suggestions.includes(100000) && total <= 100000) suggestions.push(100000);

    return suggestions.sort((a, b) => a - b).slice(0, 5);
  };

  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Mobile Floating Notification on Top Right (when in Catalog tab, unobtrusive & translucent) */}
      {scanSuccessToast && mobileTab === 'catalog' && (
        <div className="md:hidden fixed top-14 right-3 z-50 max-w-[85vw] animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <div className="bg-emerald-950/75 dark:bg-black/75 backdrop-blur-xl text-white px-3 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 border border-emerald-400/40 pointer-events-auto ring-1 ring-emerald-500/20">
            {scanSuccessToast.product.imageUrl ? (
              <img
                src={scanSuccessToast.product.imageUrl}
                alt={scanSuccessToast.product.name}
                className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-600/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-white truncate block">
                {scanSuccessToast.product.name}
              </span>
              <p className="text-[10px] text-emerald-200">
                {formatRupiah(scanSuccessToast.product.price)} · +1 {language === 'en' ? 'In cart' : 'Masuk keranjang'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScanSuccessToast(null)}
              className="text-emerald-300 hover:text-white p-1 ml-0.5 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Navigation Anchor Bar for Mobile & Tablet (< xl) - Cart is on Top, Catalog is Below */}
      <div className="xl:hidden flex items-center p-1 bg-neutral-200/70 dark:bg-neutral-800 rounded-xl mb-3 sm:mb-4">
        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            const el = document.getElementById('pos-cart-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative cursor-pointer bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === 'en' ? 'Cart & Payment' : 'Keranjang & Bayar'}</span>
          {cartItemCount > 0 && (
            <span className="ml-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {cartItemCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            const el = document.getElementById('pos-catalog-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          <Package className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Product Catalog' : 'Katalog Produk'}</span>
        </button>
      </div>

      {/* Real-time alert banner if error exists */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Responsive POS Layout: Cart on Top on Mobile/Tablet (< xl: order-1), Side-by-Side on Desktop (xl: order-2, 4-cols sticky) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Section 1 (DOM Catalog): On < xl rendered BELOW Cart (order-2), on xl: rendered on Left (order-1, 8-cols) */}
        <div
          id="pos-catalog-section"
          className="order-2 xl:order-1 xl:col-span-8 space-y-4 min-w-0 max-w-full pb-6 xl:pb-0 scroll-mt-20"
        >
          {/* Top Barcode & Search Controls */}
          <div className="bg-white dark:bg-neutral-900 p-3 sm:p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2.5 w-full min-w-0 max-w-full">
            <div className="flex flex-col sm:flex-row xl:flex-row items-stretch gap-2.5 w-full min-w-0">
              {/* Live Instant Search input with autocomplete popup */}
              <div ref={searchContainerRef} className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(e);
                    }
                  }}
                  placeholder={language === 'en' ? 'Search product or SKU... [/]' : 'Cari nama produk / kode SKU... [/]'}
                  className="w-full pl-9 pr-9 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />

                {searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchFocused(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
                    title={language === 'en' ? 'Clear search' : 'Bersihkan pencarian'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 pointer-events-none">
                    /
                  </span>
                )}

                {/* Instant Autocomplete Suggestions Floating Dropdown */}
                {isSearchFocused && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-neutral-200 shadow-2xl z-30 overflow-hidden text-xs">
                    <div className="p-2 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{language === 'en' ? `Instant results (${instantMatches.length})` : `Hasil pencarian instan (${instantMatches.length})`}</span>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {language === 'en' ? 'Press [Enter] for top item' : 'Tekan [Enter] untuk barang teratas'}
                      </span>
                    </div>

                    {instantMatches.length === 0 ? (
                      <div className="p-4 text-center text-neutral-400">
                        {language === 'en' ? `No products matching "${searchQuery}"` : `Tidak ada barang yang cocok dengan "${searchQuery}"`}
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                        {instantMatches.map((prod) => {
                          const isOut = prod.stock <= 0;
                          return (
                            <div
                              key={prod.id}
                              onClick={() => {
                                addToCart(prod);
                                setSearchQuery('');
                                setIsSearchFocused(false);
                              }}
                              className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                isOut
                                  ? 'opacity-60 bg-neutral-50 hover:bg-neutral-100'
                                  : 'hover:bg-emerald-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {prod.imageUrl ? (
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="w-8 h-8 rounded-lg object-cover border border-neutral-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 shrink-0">
                                    <Package className="w-4 h-4 opacity-50" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-neutral-900 truncate">
                                      {prod.name}
                                    </span>
                                    <span className="font-mono-numbers text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 shrink-0">
                                      {prod.sku}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                                    <span>{prod.category}</span>
                                    <span>·</span>
                                    <span
                                      className={
                                        isOut
                                          ? 'text-rose-600 font-semibold'
                                          : 'text-neutral-500'
                                      }
                                    >
                                      {isOut
                                        ? t.dashboard.outOfStockAlert
                                        : (language === 'en' ? `Left ${prod.stock} ${prod.unit}` : `Sisa ${prod.stock} ${prod.unit}`)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="font-bold text-neutral-900 font-mono-numbers">
                                  {formatRupiah(prod.price)}
                                </span>
                                <button
                                  type="button"
                                  disabled={isOut}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md shadow-xs transition-colors ${
                                    isOut
                                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                >
                                  {language === 'en' ? '+ Add' : '+ Tambah'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Barcode scanner direct entry */}
              <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5 w-full xl:w-64 2xl:w-72 shrink-0 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Barcode className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => handleBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleBarcodeSubmit(e);
                      }
                    }}
                    placeholder={language === 'en' ? 'Scan / Type SKU...' : 'Scan / Ketik SKU...'}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono-numbers bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                >
                  Scan
                </button>
              </form>
            </div>

            {/* Row 2: Responsive Action Toolbar (Express Scan Mode, Print Barcode, Scanner Status) */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 w-full min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                {/* Express Checkout on Scan Mode Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTap();
                    setExpressCheckoutOnScan(!expressCheckoutOnScan);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border max-w-full shrink-0 ${
                    expressCheckoutOnScan
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                  title={
                    language === 'en'
                      ? 'Express Mode: Scanning an SKU automatically adds item to cart and opens payment step!'
                      : 'Mode Express: Scan kode SKU otomatis masuk keranjang dan langsung membuka langkah pembayaran!'
                  }
                >
                  <Zap className={`w-3.5 h-3.5 shrink-0 ${expressCheckoutOnScan ? 'fill-current animate-pulse text-yellow-100' : 'text-neutral-500'}`} />
                  <span className="whitespace-nowrap">
                    <span className="hidden sm:inline">Scan Langsung </span>
                    <span className="sm:hidden">Scan & </span>
                    Bayar
                  </span>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                    expressCheckoutOnScan ? 'bg-amber-700/60 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {expressCheckoutOnScan ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Print Barcode Label Modal Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTap();
                    setIsSkuModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 transition-colors cursor-pointer shrink-0"
                  title={language === 'en' ? 'Open Barcode SKU Maker & Printer' : 'Buka Pembuat & Cetak Barcode SKU Produk'}
                >
                  <Barcode className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">
                    <span className="hidden sm:inline">Cetak </span>Barcode<span className="hidden sm:inline"> SKU</span>
                  </span>
                </button>
              </div>

              {/* USB Scanner Hardware Status Indicator */}
              <div
                className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-[11px] font-medium select-none shrink-0"
                title={language === 'en' ? 'USB Scanner active - barcode scans directly into cart' : 'Alat scanner USB aktif & siap mendeteksi barcode otomatis ke keranjang'}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="font-mono text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">
                  <span className="hidden sm:inline">USB </span>Scanner Siap
                </span>
              </div>
            </div>

            {/* Category Segmented Filter Tabs & Catalog View Mode Switcher */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs flex-1 min-w-0">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        soundFx.playTap();
                        setSelectedCategory(cat);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900'
                      }`}
                    >
                      {cat === 'Semua' ? t.common.all : cat}
                    </button>
                  );
                })}
              </div>

              {/* View Switcher: Card (Grid) vs List */}
              <div className="flex items-center gap-0.5 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTap();
                    setCatalogViewMode('grid');
                  }}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    catalogViewMode === 'grid'
                      ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  title={language === 'en' ? 'Card / Grid View' : 'Tampilan Kartu'}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTap();
                    setCatalogViewMode('list');
                  }}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    catalogViewMode === 'list'
                      ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  title={language === 'en' ? 'List View' : 'Tampilan List'}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Catalog Display: Grid Cards vs List View */}
          {catalogViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full bg-white p-10 rounded-xl border border-neutral-200 text-center space-y-2">
                  <p className="text-sm font-semibold text-neutral-700">{t.inventory.noProducts}</p>
                  <p className="text-xs text-neutral-500">
                    {language === 'en' ? 'Try another search query or select All categories.' : 'Coba kata kunci pencarian lain atau pilih kategori Semua.'}
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                  const inCart = cart.find((i) => i.product.id === product.id);
                  const cartQty = inCart ? inCart.quantity : 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`group bg-white rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between transition-all select-none text-left ${
                        isOutOfStock
                          ? 'opacity-60 border-neutral-200 cursor-not-allowed bg-neutral-50'
                          : 'border-neutral-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div>
                        {/* Product Image Thumbnail */}
                        {product.imageUrl ? (
                          <div className="w-full h-24 sm:h-28 rounded-lg overflow-hidden bg-neutral-100 mb-2 border border-neutral-200/60 relative">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-16 sm:h-20 rounded-lg bg-neutral-50 flex items-center justify-center mb-2 border border-dashed border-neutral-200 text-neutral-300">
                            <Package className="w-6 h-6 opacity-40" />
                          </div>
                        )}

                        {/* Category & SKU metadata */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                          <span className="truncate max-w-[65%]">{product.category}</span>
                          <span className="font-mono-numbers text-[10px] text-neutral-400 shrink-0">
                            {product.sku}
                          </span>
                        </div>

                        {/* Product Name */}
                        <h4 className="text-xs font-semibold text-neutral-900 leading-snug line-clamp-2 min-h-[32px] group-hover:text-emerald-700 transition-colors">
                          {product.name}
                        </h4>
                      </div>

                      <div className="pt-2 sm:pt-3 mt-2 border-t border-neutral-100 flex items-end justify-between">
                        <div className="min-w-0 flex-1 pr-1">
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 font-mono-numbers truncate">
                            {formatRupiah(product.price)}
                          </div>
                          {/* Real-time stock status */}
                          <div className="text-[10px] sm:text-[11px] mt-0.5 font-mono-numbers truncate">
                            {isOutOfStock ? (
                              <span className="text-rose-600 font-semibold">{t.dashboard.outOfStockAlert}</span>
                            ) : isLowStock ? (
                              <span className="text-amber-600 font-semibold">
                                {language === 'en' ? `Left ${product.stock} ${product.unit}` : `Sisa ${product.stock} ${product.unit}`}
                              </span>
                            ) : (
                              <span className="text-neutral-500">
                                {language === 'en' ? `Stock: ${product.stock} ${product.unit}` : `Stok: ${product.stock} ${product.unit}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Add button / Cart state indicator */}
                        <div className="shrink-0">
                          {cartQty > 0 ? (
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono-numbers shadow-xs">
                              {cartQty}
                            </div>
                          ) : (
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                isOutOfStock
                                  ? 'bg-neutral-200 text-neutral-400'
                                  : 'bg-neutral-100 text-neutral-700 group-hover:bg-emerald-600 group-hover:text-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="bg-white p-10 rounded-xl border border-neutral-200 text-center space-y-2">
                  <p className="text-sm font-semibold text-neutral-700">{t.inventory.noProducts}</p>
                  <p className="text-xs text-neutral-500">
                    {language === 'en' ? 'Try another search query or select All categories.' : 'Coba kata kunci pencarian lain atau pilih kategori Semua.'}
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                  const inCart = cart.find((i) => i.product.id === product.id);
                  const cartQty = inCart ? inCart.quantity : 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`group bg-white rounded-xl border p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all select-none text-left ${
                        isOutOfStock
                          ? 'opacity-60 border-neutral-200 cursor-not-allowed bg-neutral-50'
                          : 'border-neutral-200 hover:border-emerald-500 hover:shadow-xs cursor-pointer'
                      }`}
                    >
                      {/* Product Thumbnail & Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-neutral-200/80 shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-dashed border-neutral-200 flex items-center justify-center shrink-0 text-neutral-400">
                            <Package className="w-5 h-5 opacity-40" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono-numbers text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 shrink-0">
                              {product.sku}
                            </span>
                            <span className="text-[11px] text-neutral-400 truncate">
                              {product.category}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate group-hover:text-emerald-700 transition-colors">
                            {product.name}
                          </h4>
                        </div>
                      </div>

                      {/* Stock Status Indicator */}
                      <div className="text-right shrink-0 min-w-[70px] sm:min-w-[90px]">
                        {isOutOfStock ? (
                          <span className="text-[11px] text-rose-600 font-semibold">{t.dashboard.outOfStockAlert}</span>
                        ) : isLowStock ? (
                          <span className="text-[11px] text-amber-600 font-semibold">
                            {language === 'en' ? `Left ${product.stock} ${product.unit}` : `Sisa ${product.stock} ${product.unit}`}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-500">
                            {language === 'en' ? `Stock: ${product.stock} ${product.unit}` : `Stok: ${product.stock} ${product.unit}`}
                          </span>
                        )}
                      </div>

                      {/* Price & Add to Cart Counter */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right min-w-[70px] sm:min-w-[90px]">
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 font-mono-numbers">
                            {formatRupiah(product.price)}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono-numbers">
                            / {product.unit}
                          </div>
                        </div>

                        {cartQty > 0 ? (
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono-numbers shadow-xs">
                            {cartQty}
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              isOutOfStock
                                ? 'bg-neutral-200 text-neutral-400'
                                : 'bg-neutral-100 text-neutral-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Section 2 (Cart): On < xl rendered ABOVE Catalog (order-1), on xl: rendered on Right (order-2, 4-cols sticky) */}
        <div
          id="pos-cart-section"
          className="order-1 xl:order-2 xl:col-span-4 xl:sticky xl:top-4 space-y-3 sm:space-y-4 min-w-0 max-w-full scroll-mt-20"
        >
          {/* Top Right: Scan Notification & Hardware Scanner Status Bar (Compact & Responsive) */}
          <div className="hidden sm:flex min-h-[80px] xl:min-h-[108px] flex-col justify-stretch">
            {scanSuccessToast ? (
              <div className="flex-1 bg-emerald-600/85 dark:bg-emerald-700/85 backdrop-blur-md text-white p-2.5 sm:p-3 rounded-xl shadow-md border border-emerald-400/40 flex items-center justify-between gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  {scanSuccessToast.product.imageUrl ? (
                    <img
                      src={scanSuccessToast.product.imageUrl}
                      alt={scanSuccessToast.product.name}
                      className="w-10 h-10 rounded-lg object-cover border border-white/25 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-200 font-bold shrink-0">
                        {scanSuccessToast.product.sku}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {scanSuccessToast.product.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100 mt-0.5 truncate">
                      {formatRupiah(scanSuccessToast.product.price)} · +1 {language === 'en' ? 'Added to cart' : 'Berhasil masuk'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScanSuccessToast(null)}
                  className="text-emerald-200 hover:text-white p-1 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex-1 bg-white dark:bg-neutral-900 p-2.5 sm:p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 shadow-xs flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <Barcode className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                        {language === 'en' ? 'Scanner Ready' : 'Scanner USB Siap'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate mt-0.5">
                      {expressCheckoutOnScan
                        ? (language === 'en' ? '⚡ Express: Direct to pay' : '⚡ Express: Langsung ke bayar')
                        : (language === 'en' ? 'Scan auto adds items to cart' : 'Scan otomatis masuk keranjang')}
                    </p>
                  </div>
                </div>

                {/* Quick Toggle on Top Right Card */}
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTap();
                    setExpressCheckoutOnScan(!expressCheckoutOnScan);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer border shrink-0 ${
                    expressCheckoutOnScan
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-500/20'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                  title="Toggle Mode Scan Langsung Bayar"
                >
                  <Zap className={`w-3 h-3 ${expressCheckoutOnScan ? 'fill-current text-white animate-pulse' : 'text-neutral-500'}`} />
                  <span className="whitespace-nowrap">{expressCheckoutOnScan ? 'Express ON' : 'Express OFF'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col xl:h-[calc(100vh-14.5rem)] xl:min-h-[500px]">
            {/* Cart Header */}
            <div className="shrink-0 p-3 sm:p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/40">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t.pos.cartTitle}</h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                  ({cartItemCount} {t.common.items})
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-neutral-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                  >
                    {t.pos.clearCart}
                  </button>
                )}
              </div>
            </div>

            {/* Cart Body: Horizontal Split on Tablet (md:flex-row), Stacked on Mobile & Vertical on Desktop (xl:flex-col) */}
            <div className="flex flex-col md:flex-row xl:flex-col flex-1 min-h-0">
              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-2.5 sm:space-y-3 max-h-80 md:max-h-96 xl:max-h-none">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 text-neutral-400">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2 sm:mb-3 text-neutral-400">
                      <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 stroke-1 text-neutral-400" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{t.pos.emptyCart}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mt-0.5">
                      {language === 'en' ? 'Scan SKU barcode or select products below' : 'Scan barcode SKU atau pilih produk di bawah'}
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const product = products.find((p) => p.id === item.product.id) || item.product;
                    const itemTotal = item.product.price * item.quantity;
                    const atMaxStock = item.quantity >= product.stock;

                    return (
                      <div
                        key={item.product.id}
                        className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/70 text-xs flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {item.product.imageUrl ? (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                className="w-10 h-10 rounded-lg object-cover border border-neutral-200/80 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-neutral-200/60 flex items-center justify-center text-neutral-400 shrink-0">
                                <Package className="w-4 h-4 opacity-50" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h5 className="font-semibold text-neutral-900 truncate">
                                {item.product.name}
                              </h5>
                              <div className="text-[11px] text-neutral-500 font-mono-numbers">
                                {formatRupiah(item.product.price)} / {item.product.unit}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-neutral-400 hover:text-rose-600 p-1 transition-colors cursor-pointer shrink-0"
                            title="Hapus barang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50">
                          {/* Stepper */}
                          <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={product.stock}
                              value={item.quantity}
                              onChange={(e) =>
                                setExactQuantity(item.product.id, parseInt(e.target.value) || 1)
                              }
                              className="w-8 text-center text-xs font-semibold font-mono-numbers focus:outline-none"
                            />
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              disabled={atMaxStock}
                              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                atMaxStock
                                  ? 'text-neutral-300 cursor-not-allowed'
                                  : 'text-neutral-600 hover:bg-neutral-100 cursor-pointer'
                              }`}
                              title={atMaxStock ? 'Stok maksimal tercapai' : 'Tambah 1'}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Subtotal Item */}
                          <div className="font-bold text-neutral-900 font-mono-numbers">
                            {formatRupiah(itemTotal)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cart Footer Calculation & Pay Button */}
              <div className={`shrink-0 md:w-80 lg:w-96 xl:w-full p-3.5 sm:p-4 border-t md:border-t-0 md:border-l xl:border-l-0 xl:border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 space-y-2.5 sm:space-y-3 ${
                cart.length === 0 ? 'hidden xl:block' : 'block'
              }`}>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>{t.common.subtotal}</span>
                    <span className="font-mono-numbers font-medium text-neutral-900 dark:text-white">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>

                  {/* Overall Discount Input */}
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-neutral-400" />
                      {language === 'en' ? 'Order Discount' : 'Diskon Transaksi'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={cartDiscountPercent}
                        onChange={(e) =>
                          setCartDiscountPercent(
                            Math.max(0, Math.min(100, Number(e.target.value) || 0))
                          )
                        }
                        className="w-12 px-1.5 py-0.5 text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded text-center font-mono-numbers focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] font-semibold text-neutral-500">%</span>
                    </div>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>{t.common.discount}</span>
                      <span className="font-mono-numbers font-medium">
                        -{formatRupiah(discountAmount)}
                      </span>
                    </div>
                  )}

                  {storeSettings.taxEnabled && (
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>{t.common.tax} ({storeSettings.taxRate}%)</span>
                      <span className="font-mono-numbers font-medium text-neutral-900 dark:text-white">
                        {formatRupiah(taxAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-bold text-neutral-900 dark:text-white pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <span>{language === 'en' ? 'Total Pay' : 'Total Bayar'}</span>
                    <span className="font-mono-numbers text-base text-emerald-700 dark:text-emerald-400">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                </div>

                <button
                  disabled={cart.length === 0}
                  onClick={handleOpenCheckout}
                  className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                    cart.length === 0
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'
                  }`}
                >
                  <span>{t.pos.processPayment}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar for Mobile & Tablet (< xl) when items exist */}
      {cart.length > 0 && (
        <div className="xl:hidden fixed bottom-4 inset-x-3 sm:inset-x-6 z-30 animate-in fade-in slide-in-from-bottom-2">
          <div
            onClick={() => {
              soundFx.playTap();
              const el = document.getElementById('pos-cart-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="bg-neutral-900/95 dark:bg-neutral-850/95 backdrop-blur-md text-white px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer border border-neutral-800 hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs font-mono-numbers shadow-xs">
                {cartItemCount}
              </div>
              <div>
                <p className="text-[10px] text-neutral-400">{language === 'en' ? 'Order Total' : 'Total Belanja'}</p>
                <p className="text-xs sm:text-sm font-bold font-mono-numbers text-emerald-400">
                  {formatRupiah(totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playTap();
                  handleOpenCheckout();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>{language === 'en' ? 'Pay Now' : 'Bayar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300 hover:text-white px-2 py-1 rounded-lg">
                <span>{language === 'en' ? 'Cart' : 'Keranjang'}</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout & Payment Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full relative shadow-2xl overflow-hidden my-auto border border-neutral-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {language === 'en' ? 'Complete Payment' : 'Selesaikan Pembayaran'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'en' ? 'Select payment method and enter cash amount' : 'Pilih metode bayar dan input nominal tunai'}
                </p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Total Display */}
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-0.5">
                <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">
                  {language === 'en' ? 'Total Amount' : 'Total Tagihan'}
                </span>
                <div className="text-2xl font-bold font-mono-numbers text-emerald-700">
                  {formatRupiah(totalAmount)}
                </div>
                <div className="text-[11px] text-emerald-600">
                  {cart.reduce((a, b) => a + b.quantity, 0)} {language === 'en' ? 'items in order' : 'item pesanan'}
                </div>
              </div>

              {/* Optional Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {t.pos.customerName}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Jane Doe / Walk-in Customer' : 'Contoh: Ibu Siti / Pelanggan Umum'}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2">
                  {t.pos.paymentMethod}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      setPaymentMethod('cash');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>{t.pos.cash}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      setPaymentMethod('qris');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                      paymentMethod === 'qris'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{t.pos.qris}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      setPaymentMethod('transfer');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                      paymentMethod === 'transfer'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{t.pos.transfer}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      setPaymentMethod('debit');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                      paymentMethod === 'debit'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{t.pos.debit}</span>
                  </button>
                </div>
              </div>

              {/* Payment Details according to Method */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      {t.pos.cashGiven}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                      placeholder={language === 'en' ? 'Enter cash amount...' : 'Masukkan nominal uang tunai...'}
                      className="w-full px-3 py-2 text-base font-bold font-mono-numbers border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  {/* Quick cash suggestion pills */}
                  <div>
                    <span className="text-[11px] text-neutral-500 mb-1.5 block">
                      {language === 'en' ? 'Quick Options:' : 'Pilihan Cepat:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playTap();
                          setCashGiven(totalAmount);
                        }}
                        className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-emerald-50 border border-neutral-200 rounded-lg transition-colors font-mono-numbers text-neutral-700"
                      >
                        {t.pos.exactMoney}
                      </button>
                      {getQuickCashSuggestions(totalAmount).map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            soundFx.playTap();
                            setCashGiven(amount);
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors font-mono-numbers ${
                            cashGiven === amount
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                          }`}
                        >
                          {formatRupiah(amount)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kembalian Calculation */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700">{t.pos.changeAmount}:</span>
                    <div className="text-right">
                      {cashGiven >= totalAmount ? (
                        <span className="text-lg font-bold font-mono-numbers text-emerald-700">
                          {formatRupiah(cashGiven - totalAmount)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold font-mono-numbers text-rose-600">
                          {language === 'en' ? 'Remaining ' : 'Kurang '}
                          {formatRupiah(totalAmount - cashGiven)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : paymentMethod === 'qris' ? (
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-3">
                  <div className="inline-block p-3 bg-white rounded-lg border border-neutral-200 shadow-xs">
                    {/* Simulated SVG QRIS Code with standard finder patterns */}
                    <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto">
                      {/* Frame */}
                      <rect width="160" height="160" fill="#ffffff" />
                      {/* Top-left locator */}
                      <rect x="10" y="10" width="40" height="40" fill="#000000" />
                      <rect x="16" y="16" width="28" height="28" fill="#ffffff" />
                      <rect x="22" y="22" width="16" height="16" fill="#000000" />
                      {/* Top-right locator */}
                      <rect x="110" y="10" width="40" height="40" fill="#000000" />
                      <rect x="116" y="16" width="28" height="28" fill="#ffffff" />
                      <rect x="122" y="22" width="16" height="16" fill="#000000" />
                      {/* Bottom-left locator */}
                      <rect x="10" y="110" width="40" height="40" fill="#000000" />
                      <rect x="16" y="116" width="28" height="28" fill="#ffffff" />
                      <rect x="22" y="22" width="16" height="16" fill="#000000" />
                      {/* QR data pixels */}
                      <rect x="60" y="20" width="8" height="8" fill="#000" />
                      <rect x="80" y="15" width="12" height="6" fill="#000" />
                      <rect x="65" y="45" width="30" height="8" fill="#000" />
                      <rect x="20" y="65" width="8" height="25" fill="#000" />
                      <rect x="40" y="70" width="15" height="15" fill="#000" />
                      <rect x="70" y="70" width="20" height="20" fill="#059669" />
                      <rect x="105" y="65" width="15" height="10" fill="#000" />
                      <rect x="130" y="80" width="15" height="12" fill="#000" />
                      <rect x="60" y="115" width="25" height="8" fill="#000" />
                      <rect x="95" y="110" width="18" height="18" fill="#000" />
                      <rect x="125" y="125" width="18" height="18" fill="#000" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-neutral-800">
                      {language === 'en' ? 'Scan QRIS via Digital Banking / E-Wallet' : 'Scan QRIS via BCA / GoPay / OVO / Dana / ShopeePay'}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono-numbers">
                      NMID: ID10202619082 · {storeSettings.storeName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-2">
                  <p className="font-semibold text-neutral-850">
                    {language === 'en'
                      ? `Non-cash payment confirmation (${paymentMethod === 'transfer' ? 'Bank Transfer' : 'Debit Card'}):`
                      : `Konfirmasi Pembayaran Non-Tunai (${paymentMethod === 'transfer' ? 'Transfer Bank' : 'Kartu Debit'}):`}
                  </p>
                  <p className="text-neutral-500">
                    {language === 'en'
                      ? 'Ensure EDC slip is printed or funds transferred before completing transaction.'
                      : 'Pastikan mesin EDC telah mengeluarkan struk valid atau mutasi saldo telah masuk sebelum menyelesaikan transaksi.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-neutral-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={paymentMethod === 'cash' && cashGiven < totalAmount}
                onClick={handleProcessTransaction}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs ${
                  paymentMethod === 'cash' && cashGiven < totalAmount
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{language === 'en' ? 'Complete & Print Receipt' : 'Selesaikan & Cetak Struk'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode SKU Maker & Printer Modal accessible from POS */}
      {isSkuModalOpen && (
        <SkuBarcodeModal
          isOpen={isSkuModalOpen}
          onClose={() => setIsSkuModalOpen(false)}
          products={products}
          categories={managedCategories}
          storeSettings={storeSettings}
        />
      )}
    </div>
  );
};
