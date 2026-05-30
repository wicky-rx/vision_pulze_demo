import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeGenerator = ({ value, height = 28, barWidth = 1 }: { value: string; height?: number; barWidth?: number }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          displayValue: true,
          text: value,
          fontSize: 11,
          height,
          width: barWidth,
          margin: 2,
        });
      } catch (e) {
        console.error("Barcode error:", e);
      }
    }
  }, [value, height, barWidth]);
  if (!value) return null;
  return <svg ref={barcodeRef} className="max-w-full h-auto" />;
};

export default BarcodeGenerator;
