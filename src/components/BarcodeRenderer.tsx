import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { isValidEan13 } from '../utils/skuGenerator';

export interface BarcodeRendererProps {
  value: string;
  type?: 'barcode' | 'qrcode';
  barcodeFormat?: 'auto' | 'CODE128' | 'EAN13';
  width?: number; // bar width multiplier (typically 1.2 to 2.5)
  height?: number; // height in px
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  className?: string;
  background?: string;
  lineColor?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  type = 'barcode',
  barcodeFormat = 'auto',
  width = 1.6,
  height = 48,
  displayValue = true,
  fontSize = 11,
  margin = 4,
  className = '',
  background = '#ffffff',
  lineColor = '#000000',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const cleanValue = (value || '').trim();

  useEffect(() => {
    setRenderError(null);
    if (!cleanValue) return;

    if (type === 'qrcode') {
      if (!canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, cleanValue, {
        width: Math.max(64, height * 1.5),
        margin: 1,
        color: {
          dark: lineColor,
          light: background === 'transparent' ? '#ffffff' : background,
        },
        errorCorrectionLevel: 'M',
      }).catch((err) => {
        console.warn('QR code generation failed:', err);
        setRenderError('QR error');
      });
      return;
    }

    // 1D Barcode Rendering using JsBarcode
    if (!svgRef.current) return;

    try {
      let format = 'CODE128';
      if (barcodeFormat === 'EAN13') {
        format = isValidEan13(cleanValue) ? 'EAN13' : 'CODE128';
      } else if (barcodeFormat === 'auto') {
        format = /^\d{13}$/.test(cleanValue) && isValidEan13(cleanValue) ? 'EAN13' : 'CODE128';
      }

      JsBarcode(svgRef.current, cleanValue, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        textMargin: 3,
        margin,
        background,
        lineColor,
        valid: () => true,
      });
    } catch (err: unknown) {
      console.warn('JsBarcode initial format failed, falling back to CODE128:', err);
      // Fallback to CODE128
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, cleanValue, {
            format: 'CODE128',
            width,
            height,
            displayValue,
            fontSize,
            margin,
            background,
            lineColor,
          });
        }
      } catch (fallbackErr: unknown) {
        console.error('JsBarcode CODE128 fallback failed:', fallbackErr);
        setRenderError('Barcode render error');
      }
    }
  }, [cleanValue, type, barcodeFormat, width, height, displayValue, fontSize, margin, background, lineColor]);

  if (!cleanValue) {
    return (
      <div className={`flex items-center justify-center p-3 text-xs text-neutral-400 border border-dashed border-neutral-300 rounded bg-neutral-50 ${className}`}>
        Belum ada kode SKU
      </div>
    );
  }

  if (renderError) {
    return (
      <div className={`flex flex-col items-center justify-center p-2 text-[10px] text-red-500 bg-red-50 rounded ${className}`}>
        <span>Gagal memuat barcode ({cleanValue})</span>
      </div>
    );
  }

  if (type === 'qrcode') {
    return (
      <div className={`inline-flex flex-col items-center justify-center ${className}`}>
        <canvas ref={canvasRef} className="max-w-full h-auto" />
        {displayValue && (
          <span className="text-[10px] font-mono tracking-wider text-neutral-800 mt-1 select-all">
            {cleanValue}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center overflow-hidden ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto block" />
    </div>
  );
};
