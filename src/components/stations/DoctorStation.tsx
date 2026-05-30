import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import JsBarcode from "jsbarcode";
import { createPortal } from "react-dom";
import { Send, Eye, UserCheck, Loader2, User, ClipboardList, Stethoscope, Microscope, Glasses, Pill, History, Plus, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, FileText, RefreshCw, ShieldCheck, Activity, AlertCircle, CheckCircle2, Clock, Heart, Printer, Calendar, Phone, Network, GitFork, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Patient } from "@/data/mockData";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { usePharmacyInventory } from "@/hooks/usePharmacyInventory";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { RefractionSummaryView } from "./RefractionSummaryView";
import { ConsultationSummaryView } from "./ConsultationSummaryView";
import { SharedPrintLayout, preparePrintData } from "./SharedPrintLayout";
import BarcodeGenerator from "@/components/BarcodeGenerator";
import { getPatientAgeString, getPatientAgeNumber, getPatientGenderString, cn, calculateSessionSlot, eyeMutedLabelClass, eyeValueClass } from "@/lib/utils";
import { sanitizeOptometryInput, getFieldTypeFromName } from "@/lib/validation";
import { ScanReportGallery } from "@/components/ScanReportGallery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";

// --- Helper Components & Functions ---

const formatRelationship = (relationship: string | undefined, gender: string | undefined) => {
  if (!relationship) return "";
  if (relationship.toLowerCase() === 'child') {
    const g = (gender || '').toLowerCase();
    if (g.startsWith('m')) return 'Son';
    if (g.startsWith('f')) return 'Daughter';
  }
  return relationship;
};

const getFamilyLevels = (members: any[]) => {
  if (members.length === 0) return { topLevel: [], bottomLevel: [] };
  if (members.length === 1) return { topLevel: [members[0]], bottomLevel: [] };

  const parsedMembers = members.map(m => {
    const age = typeof m.age === 'number' ? m.age : parseInt(m.age) || 0;
    const rel = (m.familyMaps?.[0]?.relationshipType || '').toLowerCase();
    return { ...m, parsedAge: age, rel };
  });

  const maxAge = Math.max(...parsedMembers.map(m => m.parsedAge));

  const topLevel: any[] = [];
  const bottomLevel: any[] = [];

  parsedMembers.forEach(m => {
    const isElderRelation = ['parent', 'father', 'mother', 'grandparent', 'grandfather', 'grandmother', 'uncle', 'aunt'].includes(m.rel);
    const isChildRelation = ['child', 'son', 'daughter', 'grandchild', 'grandson', 'granddaughter'].includes(m.rel);

    if (isElderRelation) {
      topLevel.push(m);
    } else if (isChildRelation) {
      bottomLevel.push(m);
    } else {
      if (maxAge > 0 && m.parsedAge >= Math.max(35, maxAge - 15)) {
        topLevel.push(m);
      } else {
        bottomLevel.push(m);
      }
    }
  });

  if (topLevel.length === 0 && parsedMembers.length > 0) {
    let eldestIndex = 0;
    let maxA = -1;
    parsedMembers.forEach((m, idx) => {
      if (m.parsedAge > maxA) {
        maxA = m.parsedAge;
        eldestIndex = idx;
      }
    });
    topLevel.push(parsedMembers[eldestIndex]);
    parsedMembers.forEach((m, idx) => {
      if (idx !== eldestIndex) {
        bottomLevel.push(m);
      }
    });
  }

  topLevel.sort((a, b) => b.parsedAge - a.parsedAge);
  bottomLevel.sort((a, b) => b.parsedAge - a.parsedAge);

  return { topLevel, bottomLevel };
};



function SectionHeader({ icon: Icon, category, title }: { icon: any, category: string, title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-orange-600 text-white shadow-md rounded-md"><Icon className="w-5 h-5 shrink-0" /></div>
      <div className="flex flex-col">
        <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-600 mb-0.5">{category}</span>
        <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-normal">{title}</h3>
      </div>
    </div>
  );
}

function EyeIndicator({ eye, compact, tableHeader }: { eye: "OD" | "OS", compact?: boolean, tableHeader?: boolean }) {
  const isOD = eye === "OD";
  return (
    <div className={cn(
      "flex items-center gap-3 w-full",
      !compact && !tableHeader && "border-b-2 border-slate-200 pb-2 mb-3",
      tableHeader && "justify-center"
    )}>
      <div className={cn(
        "flex items-center justify-center font-black border-2 shrink-0 transition-colors bg-transparent",
        tableHeader ? "w-9 h-9 text-xs" : "w-8 h-8 sm:w-9 sm:h-9 text-[12px] sm:text-xs",
        isOD
          ? "border-blue-600 text-blue-600"
          : "border-emerald-600 text-emerald-600"
      )}>{eye}</div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className={cn(
          "text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 truncate",
          isOD ? "text-blue-600/60" : "text-emerald-600/60"
        )}>
          {isOD ? "Right Eye" : "Left Eye"}
        </span>
        <span className={cn(
          "text-[11px] sm:text-[12px] font-bold tracking-tight truncate uppercase",
          isOD ? "text-blue-600" : "text-emerald-600"
        )}>
          {isOD ? "Oculus Dexter" : "Oculus Sinister"}
        </span>
      </div>
    </div>
  );
}

const DIST_VISION_OPTIONS = ["6/6", "6/6(P)", "6/7.5", "6/7.5(P)", "6/9", "6/9(P)", "6/12", "6/12(P)", "6/18", "6/18(P)", "6/24", "6/24(P)", "6/36", "6/36(P)", "6/60", "6/60(P)", "5/60", "4/60", "3/60", "2/60", "1/60", "CF at 50", "HM(+)", "CFCC", "PLPR accurate", "PLPR inaccurate"] as const;
const NEAR_VISION_OPTIONS = ["<N36", "N36", "N24", "N18", "N12", "N10", "N8", "N6"] as const;

export const INVESTIGATION_MAP: Record<string, string> = {
  "OCT": "Optical Coherence Tomography (OCT)",
  "Fundus Photography": "Fundus Photography / Fundus Fluorescein Angiography (FFA)",
  "HVFA": "Humphrey Visual Field Analysis (HVFA)",
  "Topography": "Corneal Topography",
  "Biometry": "A-Scan / Biometry"
};

interface PowerPaletteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  label: string;
  type: "sph" | "cyl" | "axis" | "add" | "dv" | "nv" | "iop" | "schiotz_scale" | "pd";
  disabled?: boolean;
}

const PowerPaletteInput = React.memo(({
  value = "",
  onChange,
  placeholder = "0.00",
  className,
  label,
  type,
  disabled
}: PowerPaletteInputProps) => {
  const [open, setOpen] = useState(false);
  const [sign, setSign] = useState<"+" | "-">(() => {
    const valStr = String(value || "");
    if (valStr.startsWith("-")) return "-";
    return "+";
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync sign with value when value changes externally
  useEffect(() => {
    const valStr = String(value || "");
    if (valStr.startsWith("-")) {
      setSign("-");
    } else if (valStr.startsWith("+")) {
      setSign("+");
    }
  }, [value]);

  useEffect(() => {
    if (open) {
      const openTime = Date.now();
      const handleScroll = (e: Event) => {
        // Ignore scroll events for the first 800ms to allow smooth scroll to complete
        if (Date.now() - openTime < 800) return;

        // If the scroll event originated from inside the popover content, do not close it
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.closest('[data-radix-popper-content-wrapper]') ||
            target.closest('.shadow-xl') ||
            target.closest('.rounded-xl'))
        ) {
          return;
        }

        setOpen(false);
      };
      window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll, { capture: true });
      };
    }
  }, [open]);

  const powerValues = [
    "0.00", "0.25", "0.50", "0.75", "1.00", "1.25", "1.50", "1.75", "2.00",
    "2.25", "2.50", "2.75", "3.00", "3.25", "3.50", "3.75", "4.00", "4.25",
    "4.50", "4.75", "5.00"
  ];

  const axisValues = [
    "90", "180", "45", "135", "30", "150", "60", "120", "0", "10", "20", "170", "160", "110", "100", "80", "70", "50"
  ];

  const pdValues = [
    "24", "24.5", "25", "25.5", "26", "26.5", "27", "27.5",
    "28", "28.5", "29", "29.5", "30", "30.5", "31", "31.5",
    "32", "32.5", "33", "33.5", "34", "34.5", "35", "35.5",
    "36", "36.5", "37", "37.5", "38", "39", "40"
  ];

  const focusNext = () => {
    const inputs = (Array.from(document.querySelectorAll('.doctor-palette-input')) as HTMLInputElement[])
      .filter(el => !el.disabled);
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx !== -1 && idx < inputs.length - 1) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }, 50);
    }
  };

  const focusPrev = () => {
    const inputs = (Array.from(document.querySelectorAll('.doctor-palette-input')) as HTMLInputElement[])
      .filter(el => !el.disabled);
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx > 0) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx - 1].focus();
        inputs[idx - 1].select();
      }, 50);
    }
  };

  const handleSelect = (val: string) => {
    let finalVal = val;
    if (type !== "axis" && type !== "dv" && type !== "nv" && type !== "iop" && type !== "schiotz_scale" && type !== "pd" && val !== "0.00") {
      finalVal = sign + val;
    }
    onChange(finalVal);

    // Auto-advance to next field after selecting a value
    const inputs = (Array.from(document.querySelectorAll('.doctor-palette-input')) as HTMLInputElement[])
      .filter(el => !el.disabled);
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx !== -1 && idx < inputs.length - 1) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }, 50);
    } else {
      setOpen(false);
    }
  };

  const handleStep = (direction: "up" | "down", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (type === "dv" || type === "nv") {
      const arr = (type === "dv" ? DIST_VISION_OPTIONS : NEAR_VISION_OPTIONS) as readonly string[];
      let idx = arr.indexOf(value);
      if (idx === -1) {
        idx = 0;
      }
      if (direction === "up") {
        idx = (idx - 1 + arr.length) % arr.length;
      } else {
        idx = (idx + 1) % arr.length;
      }
      onChange(arr[idx]);
      return;
    }

    if (type === "pd") {
      let num = parseFloat(value) || 30;
      num = direction === "up" ? num + 0.5 : num - 0.5;
      onChange(String(parseFloat(num.toFixed(1))));
      return;
    }

    let num = parseFloat(value) || 0;

    if (type === "axis") {
      const step = 5;
      if (direction === "up") {
        num = num + step;
        if (num > 180) num = 0;
      } else {
        num = num - step;
        if (num < 0) num = 180;
      }
      onChange(String(num));
    } else {
      const step = 0.25;
      if (direction === "up") {
        num = num + step;
      } else {
        num = num - step;
      }

      let signPrefix = "";
      if (num > 0) {
        signPrefix = "+";
      } else if (num < 0) {
        signPrefix = "-";
      }
      const absoluteVal = Math.abs(num).toFixed(2);
      onChange(absoluteVal === "0.00" ? "0.00" : signPrefix + absoluteVal);
    }
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <div ref={containerRef} className="relative flex items-center w-full group">
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            className={cn("doctor-palette-input pr-7", className)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (!disabled && !open) {
                setOpen(true);
                setTimeout(() => {
                  inputRef.current?.select();
                }, 50);
              }
            }}
            onClick={() => {
              if (!disabled && !open) {
                setOpen(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const inputs = Array.from(document.querySelectorAll('.doctor-palette-input')) as HTMLInputElement[];
                const idx = inputs.findIndex(el => el === inputRef.current);
                if (e.shiftKey) {
                  if (idx > 0) {
                    e.preventDefault();
                    focusPrev();
                  } else {
                    setOpen(false);
                  }
                } else {
                  if (idx !== -1 && idx < inputs.length - 1) {
                    e.preventDefault();
                    focusNext();
                  } else {
                    setOpen(false);
                  }
                }
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
          />
        </PopoverAnchor>
        {!disabled && (
          <div className="absolute right-1 flex flex-col items-center justify-center h-full py-0.5 z-10">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleStep("up", e)}
              className="text-slate-400 hover:text-orange-600 active:scale-95 transition-all p-0 h-[14px] flex items-center justify-center cursor-pointer"
              title="Increment"
            >
              <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleStep("down", e)}
              className="text-slate-400 hover:text-orange-600 active:scale-95 transition-all p-0 h-[14px] flex items-center justify-center cursor-pointer"
              title="Decrement"
            >
              <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
      <PopoverContent
        className="w-[340px] p-4 bg-white border border-slate-200 shadow-xl rounded-xl z-50 relative mt-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (
            containerRef.current &&
            (containerRef.current === e.target || containerRef.current.contains(e.target as Node))
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="absolute left-1/2 -translate-x-1/2 -top-4 w-7 h-7 flex items-center justify-center bg-[#4f6f96] hover:bg-slate-700 text-white rounded-full border-2 border-white shadow-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={focusPrev}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronUp className="-rotate-90 w-4 h-4" />
            </button>
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center truncate px-2 flex-1">
              {label}
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={focusNext}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {type !== "axis" && type !== "dv" && type !== "nv" && type !== "pd" && (
            <div className="flex justify-center bg-slate-50 p-1 rounded-lg">
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSign("+")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-black uppercase rounded-md tracking-wider transition-all",
                  sign === "+"
                    ? "bg-white text-orange-600 shadow-sm border border-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                + Plus
              </button>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSign("-")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-black uppercase rounded-md tracking-wider transition-all",
                  sign === "-"
                    ? "bg-white text-orange-600 shadow-sm border border-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                - Minus
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            {type === "axis" ? (
              axisValues.map((val) => (
                <button
                  key={val}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md"
                >
                  {val}°
                </button>
              ))
            ) : type === "dv" ? (
              DIST_VISION_OPTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md col-span-2"
                >
                  {val}
                </button>
              ))
            ) : type === "nv" ? (
              NEAR_VISION_OPTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md col-span-2"
                >
                  {val}
                </button>
              ))
            ) : type === "pd" ? (
              pdValues.map((val) => (
                <button
                  key={val}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-blue-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/30 transition-all rounded-md"
                >
                  {val}
                </button>
              ))
            ) : (
              powerValues.map((val) => (
                <button
                  key={val}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md"
                >
                  {val === "0.00" ? "0.00" : sign + val}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

interface InvestigationPaletteInputProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  label: string;
  disabled?: boolean;
}

const InvestigationPaletteInput = React.memo(({
  value = "",
  onChange,
  options = [],
  placeholder = "NAD",
  className,
  label,
  disabled
}: InvestigationPaletteInputProps) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const openTime = Date.now();
      const handleScroll = (e: Event) => {
        // Ignore scroll events for the first 800ms to allow smooth scroll to complete
        if (Date.now() - openTime < 800) return;

        // If the scroll event originated from inside the popover content, do not close it
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.closest('[data-radix-popper-content-wrapper]') ||
            target.closest('.shadow-xl') ||
            target.closest('.rounded-xl'))
        ) {
          return;
        }

        setOpen(false);
      };
      window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll, { capture: true });
      };
    }
  }, [open]);

  const focusNext = () => {
    const inputs = (Array.from(document.querySelectorAll('.doctor-investigation-input')) as HTMLInputElement[])
      .filter(el => !el.disabled);
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx !== -1 && idx < inputs.length - 1) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }, 50);
    }
  };

  const focusPrev = () => {
    const inputs = (Array.from(document.querySelectorAll('.doctor-investigation-input')) as HTMLInputElement[])
      .filter(el => !el.disabled);
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx > 0) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx - 1].focus();
        inputs[idx - 1].select();
      }, 50);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);

    // Auto-advance to next field after selecting a value
    const inputs = (Array.from(document.querySelectorAll('.doctor-investigation-input')) as HTMLInputElement[])
      .filter(el => !el.disabled);
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx !== -1 && idx < inputs.length - 1) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }, 50);
    } else {
      setOpen(false);
    }
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <div ref={containerRef} className="relative flex items-center w-full max-w-xs group">
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            className={cn(
              "doctor-investigation-input h-10 text-sm font-bold rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white transition-all shadow-sm pr-3 w-full uppercase",
              className
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (!disabled && !open) {
                setOpen(true);
              }
            }}
            onClick={() => {
              if (!disabled && !open) {
                setOpen(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const inputs = (Array.from(document.querySelectorAll('.doctor-investigation-input')) as HTMLInputElement[])
                  .filter(el => !el.disabled);
                const idx = inputs.findIndex(el => el === inputRef.current);
                if (e.shiftKey) {
                  if (idx > 0) {
                    e.preventDefault();
                    focusPrev();
                  } else {
                    setOpen(false);
                  }
                } else {
                  if (idx !== -1 && idx < inputs.length - 1) {
                    e.preventDefault();
                    focusNext();
                  } else {
                    setOpen(false);
                  }
                }
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
          />
        </PopoverAnchor>
      </div>
      <PopoverContent
        className="w-[480px] p-4 bg-white border border-slate-200 shadow-xl rounded-xl z-50 relative mt-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (
            containerRef.current &&
            (containerRef.current === e.target || containerRef.current.contains(e.target as Node))
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen(false)}
          className="absolute left-1/2 -translate-x-1/2 -top-3.5 w-7 h-7 flex items-center justify-center bg-[#4f6f96] hover:bg-slate-700 text-white rounded-full border-2 border-white shadow-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={focusPrev}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              title="Previous Field"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center truncate px-2 flex-1">
              {label} Options
            </span>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={focusNext}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              title="Next Field"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {options.map((val) => {
              const isSelected = value.toLowerCase() === val.toLowerCase();
              return (
                <button
                  key={val}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(val)}
                  className={cn(
                    "py-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-800 border rounded shadow-sm transition-all whitespace-normal break-words text-center leading-tight min-h-[36px]",
                    isSelected
                      ? "bg-orange-600 text-white border-orange-700 shadow-md"
                      : "bg-slate-50 border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-100"
                  )}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});


// --- Types ---

interface Medication {
  id: string;
  drug: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  eye: string;
  foodRelation?: string;
}

interface PrescriptionState {
  glassType?: string;
  clType?: string[];
  lensDetails?: string;
  instruction?: string;
  distance: {
    OD: { sphere: string; cylinder: string; axis: string; vn?: string };
    OS: { sphere: string; cylinder: string; axis: string; vn?: string };
  };
  near: {
    OD: { sphere: string; cylinder: string; axis: string; vn?: string };
    OS: { sphere: string; cylinder: string; axis: string; vn?: string };
  };
  distPD?: { OD: string; OS: string };
  nearPD?: { OD: string; OS: string };
}

export function DoctorStation({ patient, doctors = [] }: { patient?: Patient | null, doctors?: any[] }) {
  const { toast } = useToast();
  const { inventoryDrugs, loadingInventory } = usePharmacyInventory();
  const [localStatus, setLocalStatus] = useState<string | undefined>(patient?.status);
  const [isAttending, setIsAttending] = useState(false);
  const isConsultationStarted = localStatus === "doctor" || localStatus === "consulted" || (patient?.status === "doctor" && !["reception", "optometrist", "refraction_done"].includes(localStatus || ""));
  const isLocked = !isConsultationStarted;
  const [activeTab, setActiveTab] = useState("summary");
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refractionData, setRefractionData] = useState<any>(null);
  const [selectedHistoricalVisit, setSelectedHistoricalVisit] = useState<any>(null);
  const [isHistoryDetailsOpen, setIsHistoryDetailsOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [selectedFamilyPatient, setSelectedFamilyPatient] = useState<any | null>(null);
  const [familyPatientHistory, setFamilyPatientHistory] = useState<any[]>([]);
  const [loadingFamilyPatientHistory, setLoadingFamilyPatientHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLockedToast, setShowLockedToast] = useState(false);

  const [printType, setPrintType] = useState<'all' | 'glass' | 'medical' | null>(null);
  const originalTitleRef = useRef(document.title);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintType(null);
      document.title = originalTitleRef.current;
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useSmoothScroll(scrollContainerRef, [patient?.id, activeTab]);

  useEffect(() => {
    if (!patient?.contactNumber) {
      setFamilyMembers([]);
      return;
    }
    const fetchFamily = async () => {
      setLoadingFamily(true);
      try {
        const data = await api.searchPatients(patient.contactNumber);
        const sortedData = (data || []).sort((a: any, b: any) => {
          const ageA = typeof a.age === 'number' ? a.age : parseInt(a.age) || 0;
          const ageB = typeof b.age === 'number' ? b.age : parseInt(b.age) || 0;
          return ageB - ageA;
        });
        setFamilyMembers(sortedData);
      } catch (e) {
        console.error("Failed to fetch family members:", e);
      } finally {
        setLoadingFamily(false);
      }
    };
    fetchFamily();
  }, [patient?.contactNumber, patient?.mrNumber]);

  useEffect(() => {
    if (!selectedFamilyPatient?.mrNumber) {
      setFamilyPatientHistory([]);
      return;
    }
    const fetchFamilyPatientHistory = async () => {
      setLoadingFamilyPatientHistory(true);
      try {
        const data = await api.getVisitHistory(selectedFamilyPatient.mrNumber);
        setFamilyPatientHistory(data.visits || []);
      } catch (e) {
        console.error("Failed to fetch family patient history:", e);
      } finally {
        setLoadingFamilyPatientHistory(false);
      }
    };
    fetchFamilyPatientHistory();
  }, [selectedFamilyPatient?.mrNumber]);

  const triggerPrint = (type: 'all' | 'glass' | 'medical') => {
    originalTitleRef.current = document.title;

    const sanitizeFilenameStr = (str: string) => {
      return (str || '')
        .trim()
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .toUpperCase();
    };

    const namePart = sanitizeFilenameStr(printData?.patientName || patient?.name || 'PATIENT');
    const mrnPart = sanitizeFilenameStr(printData?.mrNumber || patient?.mrNumber || 'MRN');

    if (type === 'glass') {
      document.title = `VPN_EYE_HOSPITAL_${namePart}_${mrnPart}_GP`;
    } else {
      document.title = `VPN_EYE_HOSPITAL_${namePart}_${mrnPart}_REPORT`;
    }

    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const fmtLens = (val: any) => {
    if (val === undefined || val === null || val === "" || val === "—") return "—";
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return val;
    if (parsed === 0) return "0.00";
    return parsed > 0 ? `+${parsed.toFixed(2)}` : parsed.toFixed(2);
  };

  const fmtVA = (val: any) => {
    if (!val || val === "—") return "—";
    return val;
  };



  useEffect(() => {
    if (showLockedToast) {
      const timer = setTimeout(() => {
        setShowLockedToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showLockedToast]);

  const [activeSection, setActiveSection] = useState("sec-surface-adnexa");
  const [isNavHovered, setIsNavHovered] = useState(false);
  const navHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavMouseEnter = () => {
    if (navHoverTimeoutRef.current) {
      clearTimeout(navHoverTimeoutRef.current);
      navHoverTimeoutRef.current = null;
    }
    setIsNavHovered(true);
  };

  const handleNavMouseLeave = () => {
    if (navHoverTimeoutRef.current) {
      clearTimeout(navHoverTimeoutRef.current);
    }
    navHoverTimeoutRef.current = setTimeout(() => {
      setIsNavHovered(false);
    }, 300); // 300ms delay to prevent flickering and boundary hover loops
  };

  useEffect(() => {
    return () => {
      if (navHoverTimeoutRef.current) {
        clearTimeout(navHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "investigation") return;
    if (typeof window === "undefined" || !window.IntersectionObserver) return;

    const sections = [
      "sec-surface-adnexa",
      "sec-intraocular-pupil",
      "sec-motility-angles",
      "sec-vitreous",
      "sec-retina-macula",
      "sec-optic-disc",
      "sec-required-investigations",
      "sec-final-diagnosis"
    ];
    const observerOptions = {
      root: null,
      rootMargin: "-10% 0px -80% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [activeTab]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  const OCULAR_COMPLAINTS = [
    { key: 'eyePain', label: 'Eye Pain' },
    { key: 'blurredVision', label: 'Blurred Vision' },
    { key: 'irritation', label: 'Irritation' },
    { key: 'photophobia', label: 'Photophobia' },
    { key: 'redness', label: 'Redness' },
    { key: 'watering', label: 'Watering' },
    { key: 'discharge', label: 'Discharge' },
    { key: 'itching', label: 'Itching' },
    { key: 'dryness', label: 'Dry Eyes' },
    { key: 'headache', label: 'Headache' },
    { key: 'doubleVision', label: 'Double Vision' },
    { key: 'floaters', label: 'Floaters' },
    { key: 'burningSensation', label: 'Burning Sensation' },
    { key: 'foreignBodySensation', label: 'Foreign Body Sensation' },
    { key: 'flashesOfLight', label: 'Flashes of Light' },
    { key: 'lidSwelling', label: 'Lid Swelling' },
    { key: 'eyeStrain', label: 'Eye Strain' }
  ] as const;

  const templateTimeframes: Record<string, string> = {
    "Normal Exam": "1 Year",
    "Refractive Error": "6 Months",
    "Presbyopia": "1 Year",
    "Dry Eye Syndrome": "1 Month",
    "Allergic Conjunctival": "2 Weeks",
    "Blepharitis": "3 Weeks",
    "Cataract Eval": "6 Months",
    "Glaucoma Suspect": "3 Months",
    "Diabetic Eval (No DR)": "1 Year",
    "Diabetic Eval (DR)": "4 Months"
  };

  // Form States
  const [investigation, setInvestigation] = useState({
    diagnosisList: {
      OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>,
      OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>
    },
    eom: { OD: "", OS: "" },
    eyePain: "No",
    slitLamp: {
      lids: { OD: "", OS: "" },
      conjunctiva: { OD: "", OS: "" },
      sclera: { OD: "", OS: "" },
      cornea: { OD: "", OS: "" },
      ac: { OD: "", OS: "" },
      iris: { OD: "", OS: "" },
      pupil: { OD: "", OS: "" },
      lens: { OD: "", OS: "" },
      tonometry: { OD: "", OS: "" },
      gonioscopy: { OD: "", OS: "" },
      synaptophore: { OD: "", OS: "" },
      dilation: { OD: "", OS: "" },
    },
    fundus: {
      vitreous: { OD: "", OS: "" },
      retina: { OD: "", OS: "" },
      disc: { OD: "", OS: "" },
    },
    required: "Nothing selected",
    other: "",
    opinion: "",
    adminInstructions: "",
    followUpDate: "",
    followUpTimeFrame: "",
  });

  const [finalDiagnosis, setFinalDiagnosis] = useState({
    OD: "",
    OS: "",
  });

  const [medications, setMedications] = useState<Medication[]>([
    { id: "1", drug: "", dosage: "", route: "Topical", frequency: "", duration: "", eye: "Both" }
  ]);

  const [glassPrescription, setGlassPrescription] = useState<PrescriptionState>({
    glassType: "SVN",
    lensDetails: "Plastic, White",
    instruction: "Constant Wear",
    distance: {
      OD: { sphere: "", cylinder: "", axis: "", vn: "" },
      OS: { sphere: "", cylinder: "", axis: "", vn: "" },
    },
    near: {
      OD: { sphere: "", cylinder: "", axis: "", vn: "" },
      OS: { sphere: "", cylinder: "", axis: "", vn: "" },
    },
    distPD: { OD: "", OS: "" },
    nearPD: { OD: "", OS: "" },
  });

  const [contactLensPrescription, setContactLensPrescription] = useState<PrescriptionState>({
    distance: {
      OD: { sphere: "", cylinder: "", axis: "", vn: "" },
      OS: { sphere: "", cylinder: "", axis: "", vn: "" },
    },
    near: {
      OD: { sphere: "", cylinder: "", axis: "", vn: "" },
      OS: { sphere: "", cylinder: "", axis: "", vn: "" },
    }
  });

  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const storageKey = `doctor_work_draft_${patient?.mrNumber}`;

  const printData = useMemo(() => {
    if (selectedHistoricalVisit) {
      return preparePrintData(selectedHistoricalVisit, patient);
    } else {
      // Current active consultation
      const generateDiagnosisText = (diagList: any, manual: string) => {
        const present: string[] = [];
        if (diagList) {
          OCULAR_COMPLAINTS.forEach(c => {
            if (diagList[c.key] === 'Yes') present.push(c.label);
          });
        }
        if (manual && manual.trim()) present.push(manual.trim());
        return present.length > 0 ? present.join(', ') : 'NAD';
      };

      return {
        patientName: patient?.name || "—",
        ageGender: patient ? `${getPatientAgeString(patient)} / ${getPatientGenderString(patient)}` : "—",
        mrNumber: patient?.mrNumber || "—",
        contactNumber: patient?.contactNumber || "—",
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        doctorName: patient?.consultingDoctorName || "Dr. Gajendran MBBS DO",
        glassRx: glassPrescription,
        clRx: contactLensPrescription,
        medications: medications,
        refraction: refractionData || {},
        notes: investigation.opinion || "",
        posteriorSegment: {
          required: investigation.required,
          other: investigation.other,
          adminInstructions: investigation.adminInstructions
        },
        diagnosisText: `OD: ${generateDiagnosisText(investigation.diagnosisList?.OD, finalDiagnosis.OD)} | OS: ${generateDiagnosisText(investigation.diagnosisList?.OS, finalDiagnosis.OS)}`,
        slitLamp: investigation.slitLamp,
        eom: investigation.eom,
        fundus: investigation.fundus
      };
    }
  }, [selectedHistoricalVisit, patient, glassPrescription, contactLensPrescription, medications, refractionData, investigation, finalDiagnosis]);

  const hasGlassRxData = useMemo(() => {
    const rx = printData?.glassRx;
    if (!rx) return false;
    return !!(
      rx.distance?.OD?.sphere ||
      rx.distance?.OD?.cylinder ||
      rx.distance?.OD?.axis ||
      rx.distance?.OD?.vn ||
      rx.distance?.OS?.sphere ||
      rx.distance?.OS?.cylinder ||
      rx.distance?.OS?.axis ||
      rx.distance?.OS?.vn ||
      rx.near?.OD?.sphere ||
      rx.near?.OD?.cylinder ||
      rx.near?.OD?.axis ||
      rx.near?.OD?.vn ||
      rx.near?.OS?.sphere ||
      rx.near?.OS?.cylinder ||
      rx.near?.OS?.axis ||
      rx.near?.OS?.vn ||
      rx.distPD?.OD ||
      rx.distPD?.OS ||
      rx.nearPD?.OD ||
      rx.nearPD?.OS
    );
  }, [printData?.glassRx]);

  const hasContactLensRxData = useMemo(() => {
    const rx = printData?.clRx;
    if (!rx) return false;
    return !!(
      rx.distance?.OD?.sphere ||
      rx.distance?.OD?.cylinder ||
      rx.distance?.OD?.axis ||
      rx.distance?.OD?.vn ||
      rx.distance?.OS?.sphere ||
      rx.distance?.OS?.cylinder ||
      rx.distance?.OS?.axis ||
      rx.distance?.OS?.vn ||
      rx.near?.OD?.sphere ||
      rx.near?.OD?.cylinder ||
      rx.near?.OD?.axis ||
      rx.near?.OD?.vn ||
      rx.near?.OS?.sphere ||
      rx.near?.OS?.cylinder ||
      rx.near?.OS?.axis ||
      rx.near?.OS?.vn
    );
  }, [printData?.clRx]);

  // 1. Load Draft System
  useEffect(() => {
    if (!patient?.id) {
      setIsDraftLoaded(false);
      return;
    }

    setIsDraftLoaded(false);
    const today = new Date().toISOString().split('T')[0];

    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.date === today && parsed.data) {
          const d = parsed.data;
          if (d.investigation) {
            const loadedInv = { ...d.investigation };
            if (loadedInv.slitLamp && typeof loadedInv.slitLamp.dilation === 'string') {
              loadedInv.slitLamp = {
                ...loadedInv.slitLamp,
                dilation: { OD: loadedInv.slitLamp.dilation, OS: loadedInv.slitLamp.dilation }
              };
            }
            setInvestigation({
              ...loadedInv,
              diagnosisList: loadedInv.diagnosisList || {
                OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' },
                OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' }
              }
            });
          }
          if (d.finalDiagnosis) setFinalDiagnosis(d.finalDiagnosis);
          if (d.medications && Array.isArray(d.medications) && d.medications.length > 0) {
            // Ensure medications have IDs for stable removal
            const withIds = d.medications.map((m: any) => normalizeMedicationRow(m));
            setMedications(withIds);
          }
          if (d.glassPrescription) setGlassPrescription(d.glassPrescription);
          if (d.contactLensPrescription) setContactLensPrescription(d.contactLensPrescription);
        }
      } catch (e) {
        console.error("Draft load error", e);
      }
    }
    setIsDraftLoaded(true);
  }, [patient?.id, storageKey]);

  // 2. Auto-Save System (Debounced)
  useEffect(() => {
    if (!patient?.id || !isDraftLoaded) return;

    const saveTimer = setTimeout(() => {
      const draft = {
        date: new Date().toISOString().split('T')[0],
        data: {
          investigation,
          finalDiagnosis,
          medications,
          glassPrescription,
          contactLensPrescription
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    }, 1500);

    return () => clearTimeout(saveTimer);
  }, [investigation, finalDiagnosis, medications, glassPrescription, contactLensPrescription, patient?.id, storageKey, isDraftLoaded]);

  useEffect(() => {
    // 0. Reset Tab to Summary
    setActiveTab("summary");

    // 1. Reset all internal form states to prevent data leakage from previous patient
    setInvestigation({
      diagnosisList: {
        OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' },
        OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' }
      },
      eom: { OD: "", OS: "" },
      eyePain: "No",
      slitLamp: {
        lids: { OD: "", OS: "" },
        conjunctiva: { OD: "", OS: "" },
        sclera: { OD: "", OS: "" },
        cornea: { OD: "", OS: "" },
        ac: { OD: "", OS: "" },
        iris: { OD: "", OS: "" },
        pupil: { OD: "", OS: "" },
        lens: { OD: "", OS: "" },
        tonometry: { OD: "", OS: "" },
        gonioscopy: { OD: "", OS: "" },
        synaptophore: { OD: "", OS: "" },
        dilation: { OD: "", OS: "" },
      },
      fundus: {
        vitreous: { OD: "", OS: "" },
        retina: { OD: "", OS: "" },
        disc: { OD: "", OS: "" },
      },
      required: "Nothing selected",
      other: "",
      opinion: "",
      adminInstructions: "",
      followUpDate: "",
      followUpTimeFrame: "",
    });
    setFinalDiagnosis({ OD: "", OS: "" });
    setMedications([{ id: Math.random().toString(36).slice(2, 11), drug: "", dosage: "", route: "Topical", frequency: "", duration: "", eye: "Both" }]);
    setGlassPrescription({
      distance: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } },
      near: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } },
      distPD: { OD: "", OS: "" },
      nearPD: { OD: "", OS: "" }
    });
    setContactLensPrescription({
      distance: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } },
      near: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } }
    });

    // 2. Sync Status and Fetch New Data
    setLocalStatus(patient?.status);
    if (patient?.id) {
      fetchVisitHistory();
      fetchCurrentRefraction();
      fetchCurrentConsultation();
    }

    const handleQueueUpdate = () => {
      if (patient?.id) fetchCurrentRefraction();
    };
    window.addEventListener("patientQueueUpdated", handleQueueUpdate);
    return () => window.removeEventListener("patientQueueUpdated", handleQueueUpdate);
  }, [patient?.id, patient?.mrNumber, patient?.status]);
  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (!target || target.tagName === 'TEXTAREA' || e.isDefaultPrevented()) return;
      if (!target.closest('[role="tabpanel"]')) return;

      e.preventDefault();

      const tabsList = ["summary", "diagnosis_history", "clinical", "investigation", "glass", "medical", "history"];

      setActiveTab(prev => {
        const currentIndex = tabsList.indexOf(prev);
        const nextIndex = (currentIndex + 1) % tabsList.length;
        const nextTab = tabsList[nextIndex];
        return nextTab;
      });

      setTimeout(() => {
        const tabContent = document.querySelector(`[data-state="active"][role="tabpanel"]`) as HTMLElement;
        if (tabContent) {
          const focusableSelector = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
          const firstInput = tabContent.querySelector(focusableSelector) as HTMLElement;
          if (firstInput) {
            firstInput.focus();
          } else {
            tabContent.tabIndex = -1;
            tabContent.focus();
          }
        }
      }, 100);
    }
  }, []);


  const fetchVisitHistory = async () => {
    if (!patient?.mrNumber) return;
    try {
      setIsLoadingHistory(true);
      const data = await api.getVisitHistory(patient.mrNumber);
      setVisitHistory(data.visits || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchCurrentRefraction = async () => {
    if (!patient?.id) return;
    try {
      const data = await api.getRefraction(patient.id);
      if (data) {
        setRefractionData(data);

        // Sync initial diagnosis values if provided by refraction
        if (!finalDiagnosis.OD && !finalDiagnosis.OS && data?.ocularComplaint) {
          const newDiagList = {
            OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>,
            OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>
          };

          // Split complaints by comma
          const parts = data.ocularComplaint.split(',').map((s: string) => s.trim()).filter((s: string) => s && !s.toLowerCase().includes("followup") && !s.toLowerCase().includes("review"));
          const manualTextsOD: string[] = [];
          const manualTextsOS: string[] = [];

          parts.forEach((part: string) => {
            const trimmed = part.trim().replace(/\.$/, ""); // remove trailing period if any
            let complaintLabel = trimmed;
            let eye = "OU";

            // 1. Try matching sentence format: e.g. "Eye pain in the right eye for the past 3 days"
            let match = trimmed.match(/^(.+?)\s+in\s+(?:the\s+)?(right\s+eye|left\s+eye|both\s+eyes)?(?:\s+for\s+the\s+past\s+(\d+)\s+(day|days|month|months|year|years))?$/i);
            if (match) {
              complaintLabel = match[1].trim();
              if (match[2]) {
                const eyeStr = match[2].toLowerCase();
                if (eyeStr.includes("right")) eye = "OD";
                else if (eyeStr.includes("left")) eye = "OS";
                else if (eyeStr.includes("both")) eye = "OU";
              }
            } else {
              // 1b. Try matching sentence format without eye (e.g. Headache for the past 5 days)
              match = trimmed.match(/^(.+?)\s+for\s+the\s+past\s+(\d+)\s+(day|days|month|months|year|years)$/i);
              if (match) {
                complaintLabel = match[1].trim();
                eye = "OU";
              } else {
                // 2. Fallback to older parenthesized format: e.g. "Blurred Vision (OD, 3 days)"
                match = trimmed.match(/^(.+?)\s*\((OD|OS|OU)(?:,\s*(\d+)\s*(days|months|years))?\)$/i);
                if (match) {
                  complaintLabel = match[1].trim();
                  eye = (match[2] || "OU").toUpperCase();
                } else {
                  // 3. Fallback to older non-ocular parenthesized format: e.g. "Headache (5 days)"
                  match = trimmed.match(/^(.+?)\s*\((\d+)\s*(days|months|years)\)$/i);
                  if (match) {
                    complaintLabel = match[1].trim();
                    eye = "OU";
                  }
                }
              }
            }

            const standardComplaint = OCULAR_COMPLAINTS.find(c => c.label.toLowerCase() === complaintLabel.toLowerCase());
            if (standardComplaint) {
              if (eye === "OD" || eye === "OU") {
                newDiagList.OD[standardComplaint.key] = 'Yes';
              }
              if (eye === "OS" || eye === "OU") {
                newDiagList.OS[standardComplaint.key] = 'Yes';
              }
            } else {
              if (eye === "OD" || eye === "OU") {
                manualTextsOD.push(part);
              }
              if (eye === "OS" || eye === "OU") {
                manualTextsOS.push(part);
              }
            }
          });

          setInvestigation(prev => ({ ...prev, diagnosisList: newDiagList }));
          setFinalDiagnosis({
            OD: manualTextsOD.join(', '),
            OS: manualTextsOS.join(', ')
          });
        }
        // Initialize glass prescription state from Refraction's final glass prescription, fallback to acceptance
        if (data?.glassPrescription?.OD?.sphere !== undefined || data?.acceptance?.distance) {
          setGlassPrescription(prev => {
            const isEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
            if (isEmpty || !isDraftLoaded) {
              return {
                glassType: data?.glassPrescription?.glassType || data?.pgPower?.glass?.glassType || "SVN",
                lensDetails: data?.glassPrescription?.lensDetails || "Plastic, White",
                instruction: data?.glassPrescription?.instruction || "Constant Wear",
                distance: {
                  OD: {
                    sphere: data?.glassPrescription?.OD?.sphere || data?.acceptance?.distance?.OD?.sphere || "",
                    cylinder: data?.glassPrescription?.OD?.cylinder || data?.acceptance?.distance?.OD?.cylinder || "",
                    axis: data?.glassPrescription?.OD?.axis || data?.acceptance?.distance?.OD?.axis || "",
                    vn: data?.glassPrescription?.OD?.vn || data?.glassPrescription?.OD?.bcva || data?.acceptance?.distance?.OD?.vn || data?.visualAcuity?.OD?.aided || ""
                  },
                  OS: {
                    sphere: data?.glassPrescription?.OS?.sphere || data?.acceptance?.distance?.OS?.sphere || "",
                    cylinder: data?.glassPrescription?.OS?.cylinder || data?.acceptance?.distance?.OS?.cylinder || "",
                    axis: data?.glassPrescription?.OS?.axis || data?.acceptance?.distance?.OS?.axis || "",
                    vn: data?.glassPrescription?.OS?.vn || data?.glassPrescription?.OS?.bcva || data?.acceptance?.distance?.OS?.vn || data?.visualAcuity?.OS?.aided || ""
                  },
                },
                near: {
                  OD: {
                    sphere: data?.glassPrescription?.OD?.nearDsph || data?.glassPrescription?.OD?.nearAdd || data?.acceptance?.near?.OD?.sphere || "",
                    cylinder: data?.glassPrescription?.OD?.nearCylinder || data?.acceptance?.near?.OD?.cylinder || "",
                    axis: data?.glassPrescription?.OD?.nearAxis || data?.acceptance?.near?.OD?.axis || "",
                    vn: data?.glassPrescription?.OD?.nearVn || data?.glassPrescription?.OD?.nearBcva || data?.acceptance?.near?.OD?.vn || data?.visualAcuity?.OD?.nearVision || ""
                  },
                  OS: {
                    sphere: data?.glassPrescription?.OS?.nearDsph || data?.glassPrescription?.OS?.nearAdd || data?.acceptance?.near?.OS?.sphere || "",
                    cylinder: data?.glassPrescription?.OS?.nearCylinder || data?.acceptance?.near?.OS?.cylinder || "",
                    axis: data?.glassPrescription?.OS?.nearAxis || data?.acceptance?.near?.OS?.axis || "",
                    vn: data?.glassPrescription?.OS?.nearVn || data?.glassPrescription?.OS?.nearBcva || data?.acceptance?.near?.OS?.vn || data?.visualAcuity?.OS?.nearVision || ""
                  },
                },
                distPD: {
                  OD: data?.glassPrescription?.distPD?.OD || "",
                  OS: data?.glassPrescription?.distPD?.OS || ""
                },
                nearPD: {
                  OD: data?.glassPrescription?.nearPD?.OD || "",
                  OS: data?.glassPrescription?.nearPD?.OS || ""
                }
              };
            }
            return prev;
          });
        }

        if (data?.contactLensPrescription) {
          // Map from Refraction station's flat eye format to PrescriptionState format
          setContactLensPrescription(prev => {
            const isEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
            if (isEmpty || !isDraftLoaded) {
              return {
                clType: data.contactLensPrescription.clType || ["Soft CL"],
                distance: {
                  OD: {
                    sphere: data.contactLensPrescription.OD?.sphere || "",
                    cylinder: data.contactLensPrescription.OD?.cylinder || "",
                    axis: data.contactLensPrescription.OD?.axis || "",
                    vn: data.contactLensPrescription.OD?.vn || data?.visualAcuity?.OD?.aided || ""
                  },
                  OS: {
                    sphere: data.contactLensPrescription.OS?.sphere || "",
                    cylinder: data.contactLensPrescription.OS?.cylinder || "",
                    axis: data.contactLensPrescription.OS?.axis || "",
                    vn: data.contactLensPrescription.OS?.vn || data?.visualAcuity?.OS?.aided || ""
                  },
                },
                near: {
                  OD: {
                    sphere: data.contactLensPrescription.OD?.nearDsph || data.contactLensPrescription.OD?.nearAdd || "",
                    cylinder: data.contactLensPrescription.OD?.nearCylinder || "",
                    axis: data.contactLensPrescription.OD?.nearAxis || "",
                    vn: data.contactLensPrescription.OD?.nearVn || data?.visualAcuity?.OD?.nearVision || ""
                  },
                  OS: {
                    sphere: data.contactLensPrescription.OS?.nearDsph || data.contactLensPrescription.OS?.nearAdd || "",
                    cylinder: data.contactLensPrescription.OS?.nearCylinder || "",
                    axis: data.contactLensPrescription.OS?.nearAxis || "",
                    vn: data.contactLensPrescription.OS?.nearVn || data?.visualAcuity?.OS?.nearVision || ""
                  },
                }
              };
            }
            return prev;
          });
        }

        // Sync GAT Tonometry if available and current investigation fields are empty
        if (data?.tonometryDetails?.gat) {
          setInvestigation(prev => {
            if (!prev.slitLamp.tonometry.OD && !prev.slitLamp.tonometry.OS) {
              const getGatStr = (eyeData: any) => {
                if (!eyeData) return "";
                if (typeof eyeData === 'string') return eyeData;
                const readings = Array.isArray(eyeData.reading) ? eyeData.reading : [];
                return readings.length > 0 ? readings.join(", ") : (eyeData.iop || "");
              };

              return {
                ...prev,
                slitLamp: {
                  ...prev.slitLamp,
                  tonometry: {
                    OD: getGatStr(data.tonometryDetails.gat.OD),
                    OS: getGatStr(data.tonometryDetails.gat.OS)
                  }
                }
              };
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch refraction data:", error);
    }
  };

  const fetchCurrentConsultation = async () => {
    if (!patient?.id) return;
    try {
      const data = await api.getConsultation(patient.id);
      if (data) {
        // If we have saved data in DB, it becomes the source of truth if the draft was empty or not loaded yet.
        // Note: for safety, we only overwrite if the current fields are relatively empty.

        if (data.anteriorSegment) {
          try {
            const raw = data.anteriorSegment;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

            setInvestigation(prev => {
              // Determine if the current slitLamp state is effectively empty
              const isSlitLampEmpty = Object.values(prev.slitLamp).every(v =>
                typeof v === 'object' && v !== null ? Object.values(v).every(x => !x) : !v
              );

              if (isSlitLampEmpty || !isDraftLoaded) {
                return {
                  ...prev,
                  slitLamp: parsed.slitLamp || parsed,
                  eom: parsed.eom || prev.eom
                };
              }
              return prev;
            });
          } catch (e) { }
        }

        if (data.posteriorSegment) {
          try {
            const raw = data.posteriorSegment;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            setInvestigation(prev => {
              if (((!prev.required || prev.required === "Nothing selected") && !prev.other && !prev.adminInstructions) || !isDraftLoaded) {
                return {
                  ...prev,
                  required: parsed.required || prev.required,
                  other: parsed.other || prev.other,
                  adminInstructions: parsed.adminInstructions || prev.adminInstructions
                };
              }
              return prev;
            });
          } catch (e) { }
        }

        if (data.fundusObservation) {
          try {
            const raw = data.fundusObservation;
            const fundus = typeof raw === 'string' ? JSON.parse(raw) : raw;
            setInvestigation(prev => {
              const isFundusEmpty = !prev.fundus.vitreous.OD && !prev.fundus.vitreous.OS && !prev.fundus.retina.OD && !prev.fundus.retina.OS && !prev.fundus.disc.OD && !prev.fundus.disc.OS;
              if ((isFundusEmpty || !isDraftLoaded) && fundus) {
                return {
                  ...prev, fundus: {
                    vitreous: fundus.vitreous || prev.fundus.vitreous,
                    retina: fundus.retina || prev.fundus.retina,
                    disc: fundus.disc || prev.fundus.disc
                  }
                };
              }
              return prev;
            });
          } catch (e) { }
        }

        if (data.notes) {
          setInvestigation(prev => {
            if (!prev.opinion || !isDraftLoaded) return { ...prev, opinion: data.notes };
            return prev;
          });
        }

        if (data.visit?.followUpDate || data.visit?.followUpTimeFrame) {
          setInvestigation(prev => {
            if ((!prev.followUpDate && !prev.followUpTimeFrame) || !isDraftLoaded) {
              return {
                ...prev,
                followUpDate: data.visit.followUpDate ? data.visit.followUpDate.split('T')[0] : "",
                followUpTimeFrame: data.visit.followUpTimeFrame || ""
              };
            }
            return prev;
          });
        }

        if (data.diagnosisText) {
          setFinalDiagnosis(prev => {
            // Determine if current diagnosis is effectively empty
            if ((!prev.OD && !prev.OS) || !isDraftLoaded) {
              const text = data.diagnosisText;
              // Case 1: Format "OD: ... | OS: ..."
              if (text.includes(' | ')) {
                const parts = text.split(' | ');
                const od = parts[0]?.replace(/^OD:\s*/i, '') || "";
                const os = parts.length > 1 ? parts[1].replace(/^OS:\s*/i, '') : "";
                return { OD: od, OS: os };
              }
              // Case 2: Unified diagnosis or single eye
              return { OD: text, OS: text };
            }
            return prev;
          });
        }

        if (data.medicalPrescription && Array.isArray(data.medicalPrescription) && data.medicalPrescription.length > 0) {
          setMedications(prev => {
            // Only overwrite if current medications are mostly empty or if force loading from DB
            const isDefaultMed = prev.length === 1 && !prev[0].drug;
            if (isDefaultMed || !isDraftLoaded) {
              // Ensure IDs are present
              return data.medicalPrescription.map((m: any) => normalizeMedicationRow(m));
            }
            return prev;
          });
        }

        if (data.finalGlassPrescription) {
          setGlassPrescription(prev => {
            const isGlassEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
            if (isGlassEmpty || !isDraftLoaded) {
              return {
                glassType: "SVN",
                lensDetails: "Plastic, White",
                instruction: "Constant Wear",
                ...data.finalGlassPrescription
              };
            }
            return prev;
          });
        }

        if (data.finalContactLensPrescription) {
          setContactLensPrescription(prev => {
            const isCLEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
            if (isCLEmpty || !isDraftLoaded) {
              return data.finalContactLensPrescription;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch current consultation record:", error);
    }
  };

  const handleAttend = async () => {
    if (!patient?.id) return;
    try {
      setIsAttending(true);
      await api.attendVisit(patient.id);
      toast({ title: "Started Consultation", description: `You are now attending to ${patient.name}.` });
      setLocalStatus("doctor");
      window.dispatchEvent(new Event("patientQueueUpdated"));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAttending(false);
    }
  };

  const addMedication = () => {
    setMedications([...medications, { id: Math.random().toString(36).slice(2, 11), drug: "", dosage: "", route: "Topical", frequency: "", duration: "", eye: "Both", foodRelation: "After Food" }]);
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const normalizeMedicationRow = (m: any): Medication => ({
    id: m.id || Math.random().toString(36).slice(2, 11),
    drug: (m.drug || m.medicine || "").trim(),
    dosage: m.dosage || "",
    route: m.route?.toLowerCase() === "oral" ? "Oral" : "Topical",
    frequency: m.frequency || "",
    duration: m.duration || "",
    eye: m.eye || "Both",
    foodRelation: m.foodRelation || "After Food",
  });

  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    const sanitizedVal = sanitizeOptometryInput(value, "notes");
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, [field]: sanitizedVal };
          if (field === "route") {
            if (sanitizedVal === "Oral") {
              updated.dosage = "1 Tab";
              updated.foodRelation = "After Food";
            } else {
              updated.dosage = "1 Drop";
            }
          }
          return updated;
        }
        return m;
      })
    );
  };

  const selectMedicationDrug = (medId: string, drugName: string, route: "Topical" | "Oral" = "Topical") => {
    const trimmed = drugName.trim();
    if (!trimmed) return;
    setMedications((prev) =>
      prev.map((m) =>
        m.id === medId
          ? {
            ...m,
            drug: trimmed,
            route,
            dosage: route === "Oral" ? "1 Tab" : "1 Drop",
            foodRelation: "After Food",
          }
          : m
      )
    );
  };

  const getDrugOptionsForRow = (medId: string, currentDrug: string) => {
    const currentKey = currentDrug.trim().toLowerCase();
    const usedByOthers = new Set(
      medications
        .filter((m) => m.id !== medId && m.drug.trim())
        .map((m) => m.drug.trim().toLowerCase())
    );
    return inventoryDrugs.filter(
      (p) =>
        p.value.trim().toLowerCase() === currentKey ||
        !usedByOthers.has(p.value.trim().toLowerCase())
    );
  };

  const renderDrugInventoryChips = (medId: string, currentDrug: string, chipClassName?: string) => {
    const options = getDrugOptionsForRow(medId, currentDrug);
    return (
      <div
        className={cn(
          "flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-28 group-hover:opacity-100 group-hover:mt-1.5 group-hover:overflow-y-auto focus-within:max-h-28 focus-within:opacity-100 focus-within:mt-1.5 focus-within:overflow-y-auto transition-all duration-200 ease-out",
          chipClassName
        )}
        role="listbox"
        aria-label="Pharmacy catalog"
      >
        {loadingInventory ? (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Loading pharmacy catalog…</span>
        ) : options.length === 0 ? (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            {inventoryDrugs.length === 0 ? "No active items in pharmacy inventory" : "All catalog drugs are used on other rows"}
          </span>
        ) : (
          options.map((p) => {
            const isSelected = currentDrug.trim().toLowerCase() === p.value.trim().toLowerCase();
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                title={`${p.value} (${p.category}) — ${p.route}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectMedicationDrug(medId, p.value, p.route);
                }}
                className={cn(
                  "text-[9px] font-bold border px-1.5 py-0.5 transition-all cursor-pointer max-w-[200px] truncate",
                  isSelected
                    ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                    : "text-slate-800 hover:text-white bg-white hover:bg-slate-800 border-slate-300"
                )}
              >
                {p.label}
              </button>
            );
          })
        )}
      </div>
    );
  };

  const updateGlassPrescription = (type: "distance" | "near", eye: "OD" | "OS", field: string, value: string) => {
    const fieldType = getFieldTypeFromName(field);
    const sanitizedVal = sanitizeOptometryInput(value, fieldType);
    setGlassPrescription(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [eye]: {
          ...(prev[type] as any)[eye],
          [field]: sanitizedVal
        }
      }
    }));
  };

  const updateContactLensPrescription = (type: "distance" | "near", eye: "OD" | "OS", field: string, value: string) => {
    const fieldType = getFieldTypeFromName(field);
    const sanitizedVal = sanitizeOptometryInput(value, fieldType);
    setContactLensPrescription(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [eye]: {
          ...(prev[type] as any)[eye],
          [field]: sanitizedVal
        }
      }
    }));
  };

  const updateInvestigation = (path: string[], value: string, type: any = 'notes') => {
    const sanitizedVal = sanitizeOptometryInput(value, type);
    setInvestigation(prev => {
      const newInv = { ...prev };
      let current: any = newInv;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = sanitizedVal;
      return newInv;
    });
  };
  const selectFollowUpTimeFrame = (timeFrame: string) => {
    if (timeFrame === "none") {
      setInvestigation(prev => ({ ...prev, followUpTimeFrame: "", followUpDate: "" }));
      return;
    }

    const today = new Date();
    let futureDate = new Date();

    const match = timeFrame.match(/^(\d+)\s+(Day|Days|Week|Weeks|Month|Months|Year|Years)$/i);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith("day")) {
        futureDate.setDate(today.getDate() + val);
      } else if (unit.startsWith("week")) {
        futureDate.setDate(today.getDate() + val * 7);
      } else if (unit.startsWith("month")) {
        futureDate.setMonth(today.getMonth() + val);
      } else if (unit.startsWith("year")) {
        futureDate.setFullYear(today.getFullYear() + val);
      }
    }

    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');

    setInvestigation(prev => ({
      ...prev,
      followUpTimeFrame: timeFrame,
      followUpDate: `${yyyy}-${mm}-${dd}`
    }));
  };

  const saveConsultation = async () => {
    if (!patient?.id || isSubmitting) return;
    setIsSubmitting(true);

    const generateDiagnosisText = (diagList: any, manual: string) => {
      const present: string[] = [];
      if (diagList) {
        OCULAR_COMPLAINTS.forEach(c => {
          if (diagList[c.key] === 'Yes') present.push(c.label);
        });
      }
      if (manual && manual.trim()) present.push(manual.trim());
      return present.length > 0 ? present.join(', ') : 'NAD';
    };

    try {
      await api.saveConsultation(patient.id, {
        anteriorSegment: { slitLamp: investigation.slitLamp, eom: investigation.eom, eyePain: (investigation.diagnosisList?.OD?.eyePain === 'Yes' || investigation.diagnosisList?.OS?.eyePain === 'Yes') ? 'Yes' : 'No' },
        fundusObservation: investigation.fundus,
        posteriorSegment: {
          required: investigation.required,
          other: investigation.other,
          adminInstructions: investigation.adminInstructions
        },
        diagnosisText: `OD: ${generateDiagnosisText(investigation.diagnosisList?.OD, finalDiagnosis.OD)} | OS: ${generateDiagnosisText(investigation.diagnosisList?.OS, finalDiagnosis.OS)}`,
        medicalPrescription: medications,
        finalGlassPrescription: glassPrescription,
        finalContactLensPrescription: contactLensPrescription,
        notes: investigation.opinion,
        followUpDate: investigation.followUpDate || null,
        followUpTimeFrame: investigation.followUpTimeFrame || null
      });

      toast({
        title: "Consultation Completed",
        description: "Clinical records and prescriptions have been successfully synchronized.",
        className: "bg-orange-600 text-white border-0 rounded-none font-bold"
      });

      // Clear draft on successful save
      const storageKey = `doctor_work_draft_${patient.mrNumber}`;
      localStorage.removeItem(storageKey);

      setLocalStatus("consulted");
      fetchVisitHistory();
      fetchCurrentConsultation();
      window.dispatchEvent(new Event("patientQueueUpdated"));

      // Navigate to a blank state or next patient
      // For now, staying on the same patient with updated status
    } catch (error: any) {
      toast({
        title: "Synchronization Error",
        description: error.message || "Could not save consultation. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patient || !patient.id) {
    return (
      <div className="flex-1 p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No Patient Selected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Please select a patient from the queue to start the consultation.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-orange-50/30 relative doctor-station-container" onKeyDown={handleContainerKeyDown}>
      {/* Premium Diagnostic Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-2 md:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-30 gap-4 md:gap-8 sticky top-0">
        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto relative z-10">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-2 md:p-3 rounded-xl shrink-0 shadow-lg shadow-orange-200/50 hidden xs:flex items-center justify-center">
            <Stethoscope className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="text-sm md:text-lg font-black text-slate-900 tracking-tight uppercase truncate">{patient.name || "UNNAMED PATIENT"}</h2>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className="bg-orange-600 text-white text-[9px] md:text-[10px] px-2 md:px-2.5 font-mono tracking-widest rounded-full h-4 md:h-5 font-black border-2 border-white shadow-sm">MR-{patient.mrNumber || "0000"}</Badge>
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[8px] md:text-[10px] px-2 font-black rounded-full h-4 md:h-5">T-{patient.tokenNumber || "—"}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 w-fit px-2 py-0.5 rounded-md">
              <User className="w-3 h-3 text-slate-400" />
              <span>{getPatientGenderString(patient)}</span>
              <span className="text-slate-300">•</span>
              <span>{getPatientAgeString(patient)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-orange-600 font-black tracking-widest uppercase">Clinical Consultation</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 relative z-10">
          {localStatus === "completed" && (
            <Badge className="bg-emerald-600 text-white border-0 gap-2 h-8 md:h-10 px-4 md:px-5 rounded-none font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-md shrink-0">
              <CheckCircle2 className="w-4 h-4 md:w-4 md:h-4" />
              Visit Completed
            </Badge>
          )}
          {["reception", "optometrist", "refraction_done"].includes(localStatus || "") && (
            <div className="relative">
              {(() => {
                const isFollowUp = !!(patient?.complaint?.toLowerCase().includes("followup") || patient?.complaint?.toLowerCase().includes("follow up"));
                const canAttend = localStatus === "refraction_done" || isFollowUp;
                return (
                  <Button
                    onClick={handleAttend}
                    disabled={isAttending || !canAttend}
                    className={cn(
                      "h-8 md:h-10 px-5 md:px-6 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] rounded-none shadow-xl transition-all gap-2",
                      canAttend
                        ? "bg-orange-600 hover:bg-black text-white"
                        : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none hover:bg-slate-300"
                    )}
                    title={!canAttend ? "Cannot begin consultation until Refraction is done (except for Follow-up patients)" : ""}
                  >
                    {isAttending ? "Accessing..." : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> Begin Consultation
                      </>
                    )}
                  </Button>
                );
              })()}
              {showLockedToast && (
                <div
                  onClick={() => setShowLockedToast(false)}
                  className="absolute right-0 top-full mt-3 z-[999] w-[280px] sm:w-[320px] bg-white text-slate-800 p-4 shadow-2xl rounded-none cursor-pointer transform transition-all duration-300 ease-out animate-bounce-short border-2 border-orange-500"
                >
                  <div className="absolute right-6 -top-2 w-4 h-4 bg-white rotate-45 border-t-2 border-l-2 border-orange-500" />

                  <div className="space-y-3 relative">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-orange-100 rounded-none mt-0.5">
                        <UserCheck className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-orange-600">Start Consultation First</h4>
                        <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                          Please click this <strong className="text-orange-600 underline font-black">Begin Consultation</strong> button to unlock editing on clinical findings.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Click to close</span>
                      <button className="text-[10px] font-black uppercase px-3 py-1 bg-orange-600 text-white hover:bg-black transition-colors rounded-none">
                        Got it
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(localStatus === "doctor" || localStatus === "consulted") && (
            <Button
              className={cn(
                "h-8 md:h-10 px-5 md:px-6 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] rounded-none shadow-xl transition-all gap-2",
                localStatus === "consulted" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-orange-600 hover:bg-black text-white"
              )}
              onClick={saveConsultation}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {isSubmitting ? "Processing..." : (localStatus === "consulted" ? "Update Clinical Record" : "Finish and Signout")}
            </Button>
          )}


          <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Medical Officer</p>
              </div>
              <p className="text-[11px] md:text-xs font-black text-slate-900 truncate max-w-[150px]">Lead Physician</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative overflow-x-hidden">
        <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10"
          style={{ zoom: 1.1 } as React.CSSProperties}
        >
          <div className="bg-white border-b shadow-sm z-10 sticky top-0 px-0 sm:px-8">
            <div className="flex overflow-x-auto sm:overflow-x-visible no-scrollbar scroll-smooth snap-x snap-mandatory w-full sm:w-auto">
              <TabsList className="h-14 sm:h-16 bg-transparent gap-0 sm:gap-10 p-0 flex flex-nowrap sm:flex-wrap w-full sm:w-auto border-0 justify-start">
                {[
                  { id: "summary", icon: User, label: "Summary" },
                  { id: "diagnosis_history", icon: ClipboardList, label: "Diagnosis" },
                  { id: "clinical", icon: Stethoscope, label: "Refraction" },
                  { id: "investigation", icon: Microscope, label: "Investigation" },
                  { id: "glass", icon: Glasses, label: "Glass Rx" },
                  { id: "medical", icon: Pill, label: "Medical Rx" },
                  { id: "followup", icon: Calendar, label: "Follow Up" },
                  { id: "history", icon: History, label: "Past Reports" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-orange-600 rounded-none px-5 sm:px-0 text-[12px] sm:text-[11px] font-black uppercase tracking-widest h-full text-slate-600 opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:text-orange-600 flex gap-2 sm:gap-2.5 items-center transition-all shrink-0 snap-start whitespace-nowrap"
                  >
                    <tab.icon className={cn("w-3.5 h-3.5 transition-colors hidden md:block", activeTab === tab.id ? "text-orange-600" : "text-slate-400")} />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent relative z-10 bg-orange-50/50">
            <TabsContent value="summary" className="p-4 sm:p-6 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Demographics - col-span-3 */}
                <Card className="lg:col-span-3 clinical-card border border-slate-200 shadow-sm">
                  <div className="p-4 border-b bg-orange-50/30 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-orange-600 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4" /> Patient Demographics
                    </h3>
                    <Badge className="bg-orange-600 text-[10px] font-black h-5 uppercase px-2 rounded-none whitespace-nowrap shrink-0">
                      MRN: {patient.mrNumber || "N/A"}
                    </Badge>
                  </div>

                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Full Legal Name</label>
                      <p className="font-bold text-base text-orange-600 truncate" title={patient.name}>{patient.name}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Gender & Age</label>
                      <p className="font-bold text-base text-slate-700">{getPatientGenderString(patient)}, {getPatientAgeString(patient)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Primary Contact</label>
                      <p className="font-bold text-base text-slate-700">{patient.contactNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Emergency Contact</label>
                      <p className="font-bold text-base text-slate-500 truncate">{patient.secondaryContact || "—"}</p>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-none flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Residential Address</label>
                      <p className="font-medium text-xs text-slate-700 leading-relaxed truncate">
                        {[patient.doorNo, patient.street, patient.area, patient.city, patient.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Administrative Details / Scan Reports */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                  <Card className="clinical-card !shadow-sm border border-slate-200">
                    <div className="p-3 bg-orange-600 text-white flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-95">Administrative Details</span>
                      <Badge className="bg-white text-orange-600 text-[9px] font-black h-4 uppercase px-1.5 rounded-none">Active</Badge>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2 divide-x divide-slate-100 text-center">
                      <div className="px-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registered</span>
                        <span className="text-xs font-black text-slate-700">{patient.registeredAt || "09:12 AM"}</span>
                      </div>
                      <div className="px-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phase</span>
                        <span className="text-xs font-black text-orange-600 uppercase tracking-wider">
                          {(patient.complaint?.toLowerCase().includes("followup") ||
                            patient.complaint?.toLowerCase().includes("review") ||
                            refractionData?.ocularComplaint?.toLowerCase().includes("followup") ||
                            refractionData?.ocularComplaint?.toLowerCase().includes("review"))
                            ? "Follow-up"
                            : "Clinical"}
                        </span>
                      </div>
                      <div className="px-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Wait Time</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{patient.waitTime || "14m"}</span>
                      </div>
                    </div>
                  </Card>

                  <ScanReportGallery mrNumber={patient.mrNumber?.toString()} variant="compact" wrapInCard={true} />
                </div>
              </div>

              {/* Family / Linked Accounts Flow Tree */}
              {familyMembers.length > 1 && (
                <Card className="clinical-card border border-slate-200 shadow-sm mt-6 overflow-hidden bg-white">
                  <div className="p-4 border-b bg-orange-50/30 flex items-center justify-between">
                    <h3 className="text-sm font-black text-orange-600 uppercase tracking-wider flex items-center gap-2">
                      <Network className="w-4 h-4" /> Linked Accounts Flow
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Shared Phone Number Network
                    </span>
                  </div>
                  <div className="p-4 sm:p-5 bg-slate-50/30">
                    {(() => {
                      const { topLevel, bottomLevel } = getFamilyLevels(familyMembers);
                      return (
                        <div className="flex flex-col items-center">
                          {/* Phone Number Hub */}
                          <div className="relative flex flex-col items-center mb-3">
                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-[11px] uppercase tracking-wider px-5 py-2 rounded-full shadow-md shadow-orange-500/10 flex items-center gap-2 border-2 border-white z-10">
                              <Phone className="w-3.5 h-3.5" />
                              <span>Primary Phone: {patient.contactNumber}</span>
                            </div>
                            {/* Vertical Connector Down */}
                            <div className="w-0.5 h-3 bg-slate-300 mt-0.5" />
                          </div>

                          {/* Top Level Row (Parents/Elders) */}
                          <div className="relative flex flex-wrap justify-center gap-6 w-full max-w-4xl px-4 mb-4">
                            {/* Horizontal Bridge Line for Top Level */}
                            {topLevel.length > 1 && (
                              <div
                                className="absolute top-0 h-0.5 bg-slate-300"
                                style={{
                                  left: `${100 / (topLevel.length * 2)}%`,
                                  right: `${100 / (topLevel.length * 2)}%`
                                }}
                              />
                            )}

                            {topLevel.map((member) => {
                              const isCurrent = member.mrNumber === patient.mrNumber;
                              const relationship = formatRelationship(member.familyMaps?.[0]?.relationshipType, member.gender);
                              return (
                                <div key={member.mrNumber} className="relative flex flex-col items-center flex-1 min-w-[210px] max-w-[260px]">
                                  {/* Vertical Branch Line */}
                                  <div className="w-0.5 h-3 bg-slate-300 mb-1" />

                                  {/* Member Card */}
                                  <div
                                    onClick={() => {
                                      if (!isCurrent) {
                                        setSelectedFamilyPatient(member);
                                      }
                                    }}
                                    className={cn(
                                      "w-full p-4 rounded-xl border transition-all text-center select-none",
                                      isCurrent
                                        ? "bg-orange-50/80 border-orange-500 shadow-sm shadow-orange-100/50 ring-2 ring-orange-200/50 cursor-default"
                                        : "bg-white border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer group"
                                    )}
                                  >
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-transform group-hover:scale-110",
                                        isCurrent ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"
                                      )}>
                                        {member.name.charAt(0).toUpperCase()}
                                      </div>

                                      <div className="space-y-0.5">
                                        <h4 className="font-black text-xs text-slate-800 uppercase tracking-tight truncate max-w-[180px]">
                                          {member.name}
                                        </h4>
                                        <p className="text-[9px] font-mono font-bold text-slate-400">
                                          MRN: {member.mrNumber}
                                        </p>
                                      </div>

                                      <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-slate-200 text-slate-500 uppercase font-black">
                                          {member.gender.charAt(0)} • {getPatientAgeString(member)}
                                        </Badge>
                                        {relationship && (
                                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 font-black uppercase">
                                            {relationship}
                                          </Badge>
                                        )}
                                        {isCurrent ? (
                                          <Badge className="text-[8px] px-1.5 py-0 bg-orange-600 text-white font-black uppercase">
                                            Active Patient
                                          </Badge>
                                        ) : (
                                          <Badge className="text-[8px] px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200 font-black uppercase">
                                            Linked
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Connection to Bottom Level */}
                          {bottomLevel.length > 0 && (
                            <div className="relative flex flex-col items-center w-full mb-2">
                              <div className="w-0.5 h-4 bg-slate-300" />
                            </div>
                          )}

                          {/* Bottom Level Row (Children/Dependents) */}
                          {bottomLevel.length > 0 && (
                            <div className="relative flex flex-wrap justify-center gap-6 w-full max-w-5xl px-4">
                              {/* Horizontal Bridge Line for Bottom Level */}
                              {bottomLevel.length > 1 && (
                                <div
                                  className="absolute top-0 h-0.5 bg-slate-300"
                                  style={{
                                    left: `${100 / (bottomLevel.length * 2)}%`,
                                    right: `${100 / (bottomLevel.length * 2)}%`
                                  }}
                                />
                              )}

                              {bottomLevel.map((member) => {
                                const isCurrent = member.mrNumber === patient.mrNumber;
                                const relationship = formatRelationship(member.familyMaps?.[0]?.relationshipType, member.gender);
                                return (
                                  <div key={member.mrNumber} className="relative flex flex-col items-center flex-1 min-w-[210px] max-w-[260px]">
                                    {/* Vertical Branch Line */}
                                    <div className="w-0.5 h-3 bg-slate-300 mb-1" />

                                    {/* Member Card */}
                                    <div
                                      onClick={() => {
                                        if (!isCurrent) {
                                          setSelectedFamilyPatient(member);
                                        }
                                      }}
                                      className={cn(
                                        "w-full p-4 rounded-xl border transition-all text-center select-none",
                                        isCurrent
                                          ? "bg-orange-50/80 border-orange-500 shadow-sm shadow-orange-100/50 ring-2 ring-orange-200/50 cursor-default"
                                          : "bg-white border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer group"
                                      )}
                                    >
                                      <div className="flex flex-col items-center gap-1.5">
                                        <div className={cn(
                                          "w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-transform group-hover:scale-110",
                                          isCurrent ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"
                                        )}>
                                          {member.name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="space-y-0.5">
                                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-tight truncate max-w-[180px]">
                                            {member.name}
                                          </h4>
                                          <p className="text-[9px] font-mono font-bold text-slate-400">
                                            MRN: {member.mrNumber}
                                          </p>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-slate-200 text-slate-500 uppercase font-black">
                                            {member.gender.charAt(0)} • {getPatientAgeString(member)}
                                          </Badge>
                                          {relationship && (
                                            <Badge variant="outline" className="text-[8px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 font-black uppercase">
                                              {relationship}
                                            </Badge>
                                          )}
                                          {isCurrent ? (
                                            <Badge className="text-[8px] px-1.5 py-0 bg-orange-600 text-white font-black uppercase">
                                              Active Patient
                                            </Badge>
                                          ) : (
                                            <Badge className="text-[8px] px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200 font-black uppercase">
                                              Linked
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* 2. Diagnosis (from Refraction Station) */}
            <TabsContent value="diagnosis_history" className="p-4 sm:p-6 outline-none">
              <div className="max-w-5xl mx-auto space-y-4">
                <Card className="clinical-card bg-white shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
                    <SectionHeader icon={ClipboardList} category="Clinical Assessment" title="Primary Diagnosis & History" />
                  </div>
                  <div className="clinical-section p-4 sm:p-6 space-y-6">
                    {/* Row 1: Complaints & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Ocular Complaints */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 text-blue-600 rounded-md">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 border border-blue-200/50">
                            Ocular Complaints
                          </span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-blue-50/40 to-sky-50/20 border-l-4 border-blue-500 shadow-sm text-sm font-bold text-slate-800 min-h-[70px] flex items-center">
                          {refractionData?.ocularComplaint
                            ? refractionData.ocularComplaint
                              .split(',')
                              .map((s: string) => s.trim())
                              .filter((s: string) => !s.toLowerCase().includes("followup") && !s.toLowerCase().includes("review"))
                              .join(', ') || "No primary complaints recorded."
                            : "No primary complaints recorded."}
                        </div>
                      </div>

                      {/* Detailed Symptomology */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-indigo-100 text-indigo-600 rounded-md">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 border border-indigo-200/50">
                            Detailed Symptomology
                          </span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-indigo-50/40 to-purple-50/20 border-l-4 border-indigo-500 shadow-sm text-sm font-medium text-slate-700 min-h-[70px] flex items-center">
                          {refractionData?.complaintNotes || "No detailed symptomology described."}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Systemic History & Remarks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Systemic Health History */}
                      <div className="space-y-2 flex flex-col h-full">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-rose-100 text-rose-600 rounded-md">
                            <Heart className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 border border-rose-200/50">
                            Systemic Health History
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap flex-1 content-start">
                          {(() => {
                            let items = refractionData?.systemicHistory;
                            if (typeof items === 'string' && items.startsWith('[')) {
                              try { items = JSON.parse(items); } catch (e) { }
                            }
                            if (items && Array.isArray(items) && items.length > 0) {
                              return items.map((h: any, i: number) => {
                                const condition = typeof h === 'string' ? h : h.condition || h.name || 'Condition';
                                const duration = typeof h === 'string' ? '' : h.duration;
                                const details = typeof h === 'string' ? [] : h.details || [];
                                const medNotes = typeof h === 'string' ? '' : h.medicationNotes;
                                return (
                                  <div key={i} className="border border-rose-100 bg-rose-50/30 p-3.5 shadow-sm min-w-[140px] flex-1 flex flex-col justify-between transition-all hover:shadow-md hover:border-rose-300">
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between border-b border-rose-200/50 pb-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">{condition}</span>
                                        {duration && <span className="text-[8px] font-black text-rose-700 bg-rose-100/50 px-1.5 py-0.2 uppercase tracking-wider">{duration}</span>}
                                      </div>
                                      {details.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                                          {details.map((d: any) => (
                                            <span key={d} className="text-[10px] font-bold uppercase tracking-wider bg-white text-slate-700 border border-slate-300 px-2 py-0.5 rounded-none">{d}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {medNotes && (
                                      <div className="text-[10px] font-bold text-rose-700 mt-3 pt-2 border-t border-rose-200/30 leading-tight bg-white/40 px-2 py-1.5 border border-dashed border-rose-100 flex items-center gap-1.5">
                                        <Pill className="w-3 h-3 text-rose-600 shrink-0" />
                                        <span>Medication: {medNotes}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            }
                            if (items && typeof items === 'string') {
                              return (
                                <div className="border border-rose-100 bg-rose-50/30 p-3 shadow-sm flex-1 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">{items}</span>
                                </div>
                              );
                            }
                            return (
                              <div className="border border-dashed border-slate-200 bg-slate-50/50 p-4 flex-1 flex items-center justify-center text-slate-400 italic text-[10px] font-bold">
                                No systemic health factors reported.
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Optometrist's Clinical Remarks */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-amber-100 text-amber-600 rounded-md">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 border border-amber-200/50">
                            Optometrist's Clinical Remarks
                          </span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-amber-50/40 to-yellow-50/20 border-l-4 border-amber-500 shadow-sm italic text-sm leading-relaxed text-slate-700 relative min-h-[90px] flex items-center">
                          <span className="absolute -top-3 -left-1 text-4xl opacity-10 font-serif">“</span>
                          {refractionData?.optometristNotes ? refractionData.optometristNotes : "No specific remarks provided by the optometrist."}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* 3. Clinical Examination (Refraction Summary) */}
            <TabsContent value="clinical" className=" p-8 outline-none">
              <SectionHeader icon={ShieldCheck} category="Refraction Analysis" title="Subjective Acceptance Protocol" />
              <RefractionSummaryView data={{ ...refractionData, visitStatus: patient.status }} patient={patient} />
            </TabsContent>

            <TabsContent value="investigation" className=" p-2 lg:p-6 outline-none relative">
              {isLocked && (
                <div
                  className="absolute inset-0 z-40 cursor-default"
                  onClick={() => setShowLockedToast(true)}
                />
              )}
              <fieldset disabled={isLocked} className="contents">
                <div className="flex flex-row items-start relative max-w-7xl mx-auto mb-8 gap-6">
                  {/* Isolated Left Navigation - zero width, overflow visible self-stretch */}
                  <div className="hidden lg:block w-0 relative overflow-visible self-stretch">
                    <div className="sticky top-[120px] z-30">
                      <div
                        onMouseEnter={handleNavMouseEnter}
                        onMouseLeave={handleNavMouseLeave}
                        className={cn(
                          "absolute left-[-72px] top-[-40px] bg-white border border-slate-200 shadow-lg transition-all duration-300 overflow-hidden rounded-lg py-1 border-l-4 border-l-orange-500",
                          isNavHovered ? "w-60" : "w-16"
                        )}
                      >
                        <p className={cn(
                          "text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] my-3 px-3 truncate whitespace-nowrap transition-opacity duration-200",
                          isNavHovered ? "block" : "hidden"
                        )}>
                          Investigation Map
                        </p>
                        <p className={cn(
                          "text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] my-3 px-3 text-center transition-opacity duration-200",
                          isNavHovered ? "hidden" : "block"
                        )}>
                          MAP
                        </p>
                        <div>
                          {[
                            { id: "sec-surface-adnexa", label: "Surface & Adnexa" },
                            { id: "sec-intraocular-pupil", label: "Intraocular & Pupil" },
                            { id: "sec-motility-angles", label: "Motility & Angles" },
                            { id: "sec-vitreous", label: "Vitreous Environment" },
                            { id: "sec-retina-macula", label: "Retina & Macula" },
                            { id: "sec-optic-disc", label: "Optic Disc Profile" },
                            { id: "sec-required-investigations", label: "Required Labs" },
                            { id: "sec-final-diagnosis", label: "Final Diagnosis" },
                          ].map((sec) => (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => scrollToSection(sec.id)}
                              className={cn(
                                "w-full text-left transition-all leading-tight flex items-center py-4 px-3 border-b border-slate-100 last:border-b-0",
                                activeSection === sec.id
                                  ? "text-orange-600 border-l-2 border-l-orange-600 bg-orange-50/50"
                                  : "text-slate-400 border-l-2 border-l-transparent hover:text-slate-600 hover:border-l-slate-300 hover:bg-slate-50/30"
                              )}
                            >
                              {/* Collapsed state: show first letter */}
                              <span className={cn(
                                "w-8 text-center text-xs font-black uppercase shrink-0",
                                isNavHovered ? "hidden" : "inline-block"
                              )}>
                                {sec.label.charAt(0)}
                              </span>
                              {/* Expanded state: show full label */}
                              <span className={cn(
                                "truncate text-[10px] font-black uppercase tracking-wider pl-2 whitespace-nowrap inline-block",
                                isNavHovered ? "inline-block" : "hidden"
                              )}>
                                {sec.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-6">
                    {isLocked && (
                      <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex items-center gap-4 shadow-sm animate-pulse-slow">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                        <div>
                          <h4 className="text-sm font-black text-orange-600 uppercase">Input Locked</h4>
                          <p className="text-xs font-bold text-orange-600">Please click "Begin Consultation" at the top to start entering diagnostic findings.</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-12">
                      <div id="sec-anterior" className="scroll-mt-6 space-y-6 bg-slate-50/60 p-4 sm:p-8 border border-slate-200 shadow-sm rounded-none">
                        <SectionHeader icon={Eye} category="Slit Lamp & Specialized Profile" title="Anterior Segment" />

                        <div className="space-y-6">
                          {/* Group 1: Ocular Surface & Adnexa */}
                          <div id="sec-surface-adnexa" className="scroll-mt-24 bg-white border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
                            <h4 className="text-[12px] font-black uppercase text-orange-600 tracking-wider border-b border-orange-100/50 pb-2 flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-orange-500" /> Ocular Surface & Adnexa</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {[
                                { id: "lids", label: "Lids" },
                                { id: "conjunctiva", label: "Conjunctiva" },
                                { id: "sclera", label: "Sclera" },
                                { id: "cornea", label: "Cornea" },
                              ].map((item) => (
                                <div key={item.id} className="clinical-group bg-white border border-slate-300/80 p-2 sm:p-4 space-y-4 shadow-sm">
                                  <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block">{item.label}</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OD" />
                                      {(() => {
                                        const optionsMap: Record<string, string[]> = {
                                          lids: ["Normal", "Ptosis (Partial)", "Ptosis (Complete)", "Hordeolum Internum", "Chalazion", "Lid Tear (Partial)", "Lid Tear (Complete)"],
                                          conjunctiva: ["Normal", "Congestion", "Pterygium", "Pinguecula", "Tear", "Cyst", "Symblepharon", "Adhesion"],
                                          sclera: ["Normal", "Scleritis", "Episcleritis", "Nodule", "Thinning", "Blue Sclera", "Staphyloma"],
                                          cornea: ["Normal", "Edema", "Opacity", "Ulcer", "Foreign Body", "SPK", "Vascularization", "Keratoconus", "Arcus Senilis", "Abrasion"],
                                        };
                                        const opts = optionsMap[item.id];
                                        return (
                                          <InvestigationPaletteInput
                                            value={(investigation.slitLamp as any)[item.id].OD}
                                            onChange={val => updateInvestigation(['slitLamp', item.id, 'OD'], val)}
                                            options={opts}
                                            label={`OD ${item.label}`}
                                            placeholder="NAD"
                                          />
                                        );
                                      })()}
                                    </div>
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OS" />
                                      {(() => {
                                        const optionsMap: Record<string, string[]> = {
                                          lids: ["Normal", "Ptosis (Partial)", "Ptosis (Complete)", "Hordeolum Internum", "Chalazion", "Lid Tear (Partial)", "Lid Tear (Complete)"],
                                          conjunctiva: ["Normal", "Congestion", "Pterygium", "Pinguecula", "Tear", "Cyst", "Symblepharon", "Adhesion"],
                                          sclera: ["Normal", "Scleritis", "Episcleritis", "Nodule", "Thinning", "Blue Sclera", "Staphyloma"],
                                          cornea: ["Normal", "Edema", "Opacity", "Ulcer", "Foreign Body", "SPK", "Vascularization", "Keratoconus", "Arcus Senilis", "Abrasion"],
                                        };
                                        const opts = optionsMap[item.id];
                                        return (
                                          <InvestigationPaletteInput
                                            value={(investigation.slitLamp as any)[item.id].OS}
                                            onChange={val => updateInvestigation(['slitLamp', item.id, 'OS'], val)}
                                            options={opts}
                                            label={`OS ${item.label}`}
                                            placeholder="NAD"
                                          />
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Group 2: Anterior Chamber & Lens */}
                          <div id="sec-intraocular-pupil" className="scroll-mt-24 bg-white border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
                            <h4 className="text-[12px] font-black uppercase text-orange-600 tracking-wider border-b border-orange-100/50 pb-2 flex items-center gap-2"><Microscope className="w-3.5 h-3.5 text-orange-500" /> Intraocular Structures & Pupil</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {[
                                { id: "ac", label: "Anterior Chamber" },
                                { id: "iris", label: "Iris" },
                                { id: "pupil", label: "Pupil" },
                              ].map((item) => (
                                <div key={item.id} className="clinical-group bg-white border border-slate-300/80 p-2 sm:p-4 space-y-4 shadow-sm">
                                  <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block">{item.label}</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OD" />
                                      {(() => {
                                        const optionsMap: Record<string, string[]> = {
                                          ac: ["Normal Depth", "Shallow", "Deep", "Cells", "Flare", "Hyphema", "Hypopyon", "Irregular"],
                                          iris: ["Normal", "Synechiae", "Atrophy", "Nodule", "Coloboma", "Neovasc", "Iridodonesis", "PI Present"],
                                          pupil: ["Normal", "Round", "Abnormal", "Dilated", "Constricted", "RAPD Positive", "Sluggish", "Non-Reactive"]
                                        };
                                        const opts = optionsMap[item.id];
                                        return (
                                          <div className="flex flex-col gap-2 w-full">
                                            <InvestigationPaletteInput
                                              value={(investigation.slitLamp as any)[item.id].OD}
                                              onChange={val => updateInvestigation(['slitLamp', item.id, 'OD'], val)}
                                              options={opts}
                                              label={`OD ${item.label}`}
                                              placeholder="NAD"
                                            />
                                            {item.id === 'pupil' && (investigation.slitLamp as any).pupil.OD === "Dilated" && (
                                              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 shadow-inner w-full">
                                                <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest block mb-2">Dilation Agent</label>
                                                <InvestigationPaletteInput
                                                  value={typeof investigation.slitLamp.dilation === 'object' ? investigation.slitLamp.dilation?.OD || "" : ""}
                                                  onChange={val => updateInvestigation(['slitLamp', 'dilation', 'OD'], val)}
                                                  options={["Tropicacyl", "Tropicacyl Plus", "Cyclopentolate", "Homatropine", "Atropine", "Phenylephrine 10%", "Already Dilated", "Poor Dilation"]}
                                                  label="OD Dilation Agent"
                                                  placeholder="Select Agent"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OS" />
                                      {(() => {
                                        const optionsMap: Record<string, string[]> = {
                                          ac: ["Normal Depth", "Shallow", "Deep", "Cells", "Flare", "Hyphema", "Hypopyon", "Irregular"],
                                          iris: ["Normal", "Synechiae", "Atrophy", "Nodule", "Coloboma", "Neovasc", "Iridodonesis", "PI Present"],
                                          pupil: ["Normal", "Round", "Abnormal", "Dilated", "Constricted", "RAPD Positive", "Sluggish", "Non-Reactive"]
                                        };
                                        const opts = optionsMap[item.id];
                                        return (
                                          <div className="flex flex-col gap-2 w-full">
                                            <InvestigationPaletteInput
                                              value={(investigation.slitLamp as any)[item.id].OS}
                                              onChange={val => updateInvestigation(['slitLamp', item.id, 'OS'], val)}
                                              options={opts}
                                              label={`OS ${item.label}`}
                                              placeholder="NAD"
                                            />
                                            {item.id === 'pupil' && (investigation.slitLamp as any).pupil.OS === "Dilated" && (
                                              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 shadow-inner w-full">
                                                <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest block mb-2">Dilation Agent</label>
                                                <InvestigationPaletteInput
                                                  value={typeof investigation.slitLamp.dilation === 'object' ? investigation.slitLamp.dilation?.OS || "" : ""}
                                                  onChange={val => updateInvestigation(['slitLamp', 'dilation', 'OS'], val)}
                                                  options={["Tropicacyl", "Tropicacyl Plus", "Cyclopentolate", "Homatropine", "Atropine", "Phenylephrine 10%", "Already Dilated", "Poor Dilation"]}
                                                  label="OS Dilation Agent"
                                                  placeholder="Select Agent"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                              {[
                                { id: "lens", label: "Lens" },
                              ].map((item) => (
                                <div key={item.id} className="clinical-group bg-white border border-slate-300/80 p-2 sm:p-4 space-y-4 shadow-sm">
                                  <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block">{item.label}</label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OD" />
                                      {(() => {
                                        const opts = ["Normal", "Immature Cataract (1)", "Immature Cataract (2)", "Immature Cataract (3)", "Immature Cataract (4)", "Nuclear Cataract (G1)", "Nuclear Cataract (G2)", "Nuclear Cataract (G3)", "Nuclear Cataract (G4)", "Mature Cataract", "Posterior Subcapsular", "Traumatic Cataract", "Liquified Morgagnian", "Cortical Cataract", "Hypermature Cataract"];
                                        return (
                                          <InvestigationPaletteInput
                                            value={(investigation.slitLamp as any)[item.id].OD}
                                            onChange={val => updateInvestigation(['slitLamp', item.id, 'OD'], val)}
                                            options={opts}
                                            label={`OD ${item.label}`}
                                            placeholder="NAD"
                                          />
                                        );
                                      })()}
                                    </div>
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OS" />
                                      {(() => {
                                        const opts = ["Normal", "Immature Cataract (1)", "Immature Cataract (2)", "Immature Cataract (3)", "Immature Cataract (4)", "Nuclear Cataract (G1)", "Nuclear Cataract (G2)", "Nuclear Cataract (G3)", "Nuclear Cataract (G4)", "Mature Cataract", "Posterior Subcapsular", "Traumatic Cataract", "Liquified Morgagnian", "Cortical Cataract", "Hypermature Cataract"];
                                        return (
                                          <InvestigationPaletteInput
                                            value={(investigation.slitLamp as any)[item.id].OS}
                                            onChange={val => updateInvestigation(['slitLamp', item.id, 'OS'], val)}
                                            options={opts}
                                            label={`OS ${item.label}`}
                                            placeholder="NAD"
                                          />
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Group 3: Motility & Angles */}
                          <div id="sec-motility-angles" className="scroll-mt-24 bg-white border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
                            <h4 className="text-[12px] font-black uppercase text-orange-600 tracking-wider border-b border-orange-100/50 pb-2 flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-orange-500" /> Motility & Angles</h4>
                            <div className="grid grid-cols-1 gap-6">

                              {/* EOM */}
                              <div className="clinical-group bg-slate-50/50 border border-slate-200 p-3 sm:p-6 shadow-sm">
                                <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block mb-3">Extra Ocular Movements (EOM)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="flex flex-col flex-1 group w-full max-w-xs">
                                    <EyeIndicator eye="OD" />
                                    <InvestigationPaletteInput
                                      value={investigation.eom.OD}
                                      onChange={val => updateInvestigation(['eom', 'OD'], val)}
                                      options={["Normal", "Restricted", "Sixth Nerve Palsy", "Third Nerve Palsy"]}
                                      label="OD EOM"
                                      placeholder="NAD"
                                    />
                                  </div>
                                  <div className="flex flex-col flex-1 group w-full max-w-xs">
                                    <EyeIndicator eye="OS" />
                                    <InvestigationPaletteInput
                                      value={investigation.eom.OS}
                                      onChange={val => updateInvestigation(['eom', 'OS'], val)}
                                      options={["Normal", "Restricted", "Sixth Nerve Palsy", "Third Nerve Palsy"]}
                                      label="OS EOM"
                                      placeholder="NAD"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Gonioscopy Evaluation & Synaptophore Profile Stacked */}
                              <div className="space-y-6">
                                <div className="clinical-group bg-slate-50/50 border border-slate-200 p-3 sm:p-6 shadow-sm space-y-4">
                                  <label className="text-[11px] font-black uppercase !text-slate-700 !bg-slate-100 !border-slate-200 border px-3 py-1.5 inline-block tracking-widest">Gonioscopy Evaluation</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OD" />
                                      <InvestigationPaletteInput
                                        value={investigation.slitLamp.gonioscopy.OD}
                                        onChange={val => updateInvestigation(['slitLamp', 'gonioscopy', 'OD'], val)}
                                        options={["Normal", "Grade 4 (Wide Open)", "Grade 3 (Open)", "Grade 2 (Narrow)", "Grade 1 (Very Narrow)", "Grade 0 (Closed)"]}
                                        label="OD Gonioscopy"
                                        placeholder="NAD"
                                      />
                                    </div>
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OS" />
                                      <InvestigationPaletteInput
                                        value={investigation.slitLamp.gonioscopy.OS}
                                        onChange={val => updateInvestigation(['slitLamp', 'gonioscopy', 'OS'], val)}
                                        options={["Normal", "Grade 4 (Wide Open)", "Grade 3 (Open)", "Grade 2 (Narrow)", "Grade 1 (Very Narrow)", "Grade 0 (Closed)"]}
                                        label="OS Gonioscopy"
                                        placeholder="NAD"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="clinical-group bg-slate-50/50 border border-slate-200 p-3 sm:p-6 shadow-sm space-y-4">
                                  <label className="text-[11px] font-black uppercase !text-slate-700 !bg-slate-100 !border-slate-200 border px-3 py-1.5 inline-block tracking-widest">Synaptophore Profile</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OD" />
                                      <InvestigationPaletteInput
                                        value={investigation.slitLamp.synaptophore.OD}
                                        onChange={val => updateInvestigation(['slitLamp', 'synaptophore', 'OD'], val)}
                                        options={["Normal BSV", "SMP Present", "Fusion", "Stereopsis", "Suppression", "ARC", "NRC"]}
                                        label="OD Synaptophore"
                                        placeholder="NAD"
                                      />
                                    </div>
                                    <div className="flex flex-col group w-full max-w-xs">
                                      <EyeIndicator eye="OS" />
                                      <InvestigationPaletteInput
                                        value={investigation.slitLamp.synaptophore.OS}
                                        onChange={val => updateInvestigation(['slitLamp', 'synaptophore', 'OS'], val)}
                                        options={["Normal BSV", "SMP Present", "Fusion", "Stereopsis", "Suppression", "ARC", "NRC"]}
                                        label="OS Synaptophore"
                                        placeholder="NAD"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>

                        </div>    </div>

                      <Separator className="!my-8 opacity-25" />

                      <div id="sec-posterior" className="scroll-mt-6 space-y-6 bg-slate-50/60 p-4 sm:p-8 border border-slate-200 shadow-sm rounded-none">
                        <SectionHeader icon={Activity} category="Retinal Analysis" title="Posterior Segment" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div id="sec-vitreous" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                            <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Vitreous Environment</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col group w-full max-w-xs">
                                <EyeIndicator eye="OD" />
                                <InvestigationPaletteInput
                                  value={investigation.fundus.vitreous.OD}
                                  onChange={val => updateInvestigation(['fundus', 'vitreous', 'OD'], val)}
                                  options={["Normal", "Hemorrhage", "PVD", "Schaffer's Sign", "Inflammation"]}
                                  label="OD Vitreous"
                                  placeholder="NAD"
                                />
                              </div>
                              <div className="flex flex-col group w-full max-w-xs">
                                <EyeIndicator eye="OS" />
                                <InvestigationPaletteInput
                                  value={investigation.fundus.vitreous.OS}
                                  onChange={val => updateInvestigation(['fundus', 'vitreous', 'OS'], val)}
                                  options={["Normal", "Hemorrhage", "PVD", "Schaffer's Sign", "Inflammation"]}
                                  label="OS Vitreous"
                                  placeholder="NAD"
                                />
                              </div>
                            </div>
                          </div>
                          <div id="sec-retina-macula" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                            <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Retina & Macula Findings</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col group w-full max-w-xs">
                                <EyeIndicator eye="OD" />
                                <InvestigationPaletteInput
                                  value={investigation.fundus.retina.OD}
                                  onChange={val => updateInvestigation(['fundus', 'retina', 'OD'], val)}
                                  options={["Normal", "Detached", "Diabetic Retinopathy", "Hypertensive Retinopathy", "CSR", "BRVO / CRVO / CRAO / BRAO"]}
                                  label="OD Retina"
                                  placeholder="NAD"
                                />
                              </div>
                              <div className="flex flex-col group w-full max-w-xs">
                                <EyeIndicator eye="OS" />
                                <InvestigationPaletteInput
                                  value={investigation.fundus.retina.OS}
                                  onChange={val => updateInvestigation(['fundus', 'retina', 'OS'], val)}
                                  options={["Normal", "Detached", "Diabetic Retinopathy", "Hypertensive Retinopathy", "CSR", "BRVO / CRVO / CRAO / BRAO"]}
                                  label="OS Retina"
                                  placeholder="NAD"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                          <div id="sec-optic-disc" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                            <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Optic Disc Profile</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col group w-full max-w-xs">
                                <EyeIndicator eye="OD" />
                                <InvestigationPaletteInput
                                  value={investigation.fundus.disc.OD}
                                  onChange={val => updateInvestigation(['fundus', 'disc', 'OD'], val)}
                                  options={["Healthy Disc", "Disc Vessels Normal", "Disc Edema", "Papilledema"]}
                                  label="OD Optic Disc"
                                  placeholder="NAD"
                                />
                              </div>
                              <div className="flex flex-col group w-full max-w-xs">
                                <EyeIndicator eye="OS" />
                                <InvestigationPaletteInput
                                  value={investigation.fundus.disc.OS}
                                  onChange={val => updateInvestigation(['fundus', 'disc', 'OS'], val)}
                                  options={["Healthy Disc", "Disc Vessels Normal", "Disc Edema", "Papilledema"]}
                                  label="OS Optic Disc"
                                  placeholder="NAD"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="!my-8 opacity-25" />

                      <div className="space-y-6">
                        <div id="sec-required-investigations" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-3 sm:p-5 shadow-sm">
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-end">
                            <div className="space-y-2 w-full sm:w-1/3 transition-all duration-300">
                              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Required Investigations</Label>
                              <Select value={investigation.required} onValueChange={v => {
                                setInvestigation({ ...investigation, required: v, other: v === "Other" ? investigation.other : "" });
                              }}>
                                <SelectTrigger className="h-12 text-sm font-bold rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm focus:ring-0 focus:ring-offset-0 focus:border-orange-600"><SelectValue placeholder="Select type..." /></SelectTrigger>
                                <SelectContent className="rounded-none font-bold">
                                  <SelectItem value="Nothing selected">Nothing selected</SelectItem>
                                  <SelectItem value="OCT">OCT: Optical Coherence Tomography</SelectItem>
                                  <SelectItem value="Fundus Photography">Fundus Photography / FFA</SelectItem>
                                  <SelectItem value="HVFA">HVFA: Humphrey Fields</SelectItem>
                                  <SelectItem value="Topography">Corneal Topography</SelectItem>
                                  <SelectItem value="Biometry">A-Scan / Biometry</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {investigation.required === "Other" && (
                              <div className="flex-1 space-y-2 animate-in fade-in slide-in-from-right-4 duration-300 w-full">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Other / Specification</Label>
                                <Input placeholder="Specify other investigations..." className="h-12 text-sm font-bold rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.other} onChange={e => updateInvestigation(['other'], e.target.value)} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div id="sec-final-diagnosis" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-3 sm:p-8 space-y-4 shadow-md">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b border-slate-100 pb-4">
                            <Label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-3 py-1.5 inline-block m-0">Final Clinical Diagnosis</Label>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                            <div className="flex flex-col flex-1 group gap-4">
                              <EyeIndicator eye="OD" />
                              <div className="space-y-1 bg-white p-3 border border-slate-200 shadow-sm">
                                {OCULAR_COMPLAINTS.map((c) => (
                                  <div key={c.key} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 transition-colors">
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{c.label}</span>
                                    <div className="flex gap-1.5 shrink-0">
                                      <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OD: { ...prev.diagnosisList?.OD, [c.key]: 'Yes' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OD?.[c.key] === 'Yes' ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-red-400 hover:text-red-500")}>Yes</button>
                                      <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OD: { ...prev.diagnosisList?.OD, [c.key]: 'No' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OD?.[c.key] === 'No' || !investigation.diagnosisList?.OD?.[c.key] ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-400 hover:text-emerald-500")}>No</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Textarea placeholder="Other manual diagnosis..." className="min-h-[80px] text-sm font-black text-orange-600 rounded-none border-orange-200 bg-orange-50/30 p-3 shadow-inner focus:bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={finalDiagnosis.OD || ""} onChange={e => setFinalDiagnosis(prev => ({ ...prev, OD: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                            </div>
                            <div className="flex flex-col flex-1 group gap-4">
                              <EyeIndicator eye="OS" />
                              <div className="space-y-1 bg-white p-3 border border-slate-200 shadow-sm">
                                {OCULAR_COMPLAINTS.map((c) => (
                                  <div key={c.key} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 transition-colors">
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{c.label}</span>
                                    <div className="flex gap-1.5 shrink-0">
                                      <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OS: { ...prev.diagnosisList?.OS, [c.key]: 'Yes' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OS?.[c.key] === 'Yes' ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-red-400 hover:text-red-500")}>Yes</button>
                                      <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OS: { ...prev.diagnosisList?.OS, [c.key]: 'No' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OS?.[c.key] === 'No' || !investigation.diagnosisList?.OS?.[c.key] ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-400 hover:text-emerald-500")}>No</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Textarea placeholder="Other manual diagnosis..." className="min-h-[80px] text-sm font-black text-orange-600 rounded-none border-orange-200 bg-orange-50/30 p-3 shadow-inner focus:bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={finalDiagnosis.OS || ""} onChange={e => setFinalDiagnosis(prev => ({ ...prev, OS: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </fieldset>
            </TabsContent>
            {/* 5. Glass Prescription */}
            <TabsContent value="glass" className=" p-8 outline-none">
              <fieldset disabled={isLocked} className="contents">
                <div className="max-w-7xl mx-auto space-y-10 mb-12">
                  {isLocked && (
                    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex items-center gap-4 shadow-sm animate-pulse-slow">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="text-sm font-black text-orange-600 uppercase">Input Locked</h4>
                        <p className="text-xs font-bold text-orange-600">Please click "Begin Consultation" at the top to enable lens prescription fields.</p>
                      </div>
                    </div>
                  )}
                  <Card className="clinical-card bg-white shadow-md overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
                      <SectionHeader icon={Glasses} category="Optometry Outcome" title="Final Optometrist Recommendation" />
                    </div>
                    <div className="p-6 sm:p-8 space-y-8">
                      <div className="bg-orange-50/80 border border-orange-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-3 bg-orange-100/50 border-b border-orange-200 flex items-center gap-3">
                          <Activity className="w-4 h-4 text-orange-600" />
                          <label className="text-[11px] font-black uppercase tracking-[0.15em] text-orange-600">Refraction Acceptance Data (Read-Only)</label>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-orange-200/50">
                          <div className="p-5 flex flex-col gap-1.5 bg-blue-50/30">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", eyeMutedLabelClass("OD"))}>OD - DISTANCE</span>
                            <span className={cn("text-lg font-black font-mono tracking-tighter", eyeValueClass("OD"))}>
                              {refractionData?.acceptance?.distance?.OD ?
                                `${refractionData.acceptance.distance.OD.sphere || '0.00'} / ${refractionData.acceptance.distance.OD.cylinder || '0.00'} @ ${refractionData.acceptance.distance.OD.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                          <div className="p-5 flex flex-col gap-1.5 bg-emerald-50/30">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", eyeMutedLabelClass("OS"))}>OS - DISTANCE</span>
                            <span className={cn("text-lg font-black font-mono tracking-tighter", eyeValueClass("OS"))}>
                              {refractionData?.acceptance?.distance?.OS ?
                                `${refractionData.acceptance.distance.OS.sphere || '0.00'} / ${refractionData.acceptance.distance.OS.cylinder || '0.00'} @ ${refractionData.acceptance.distance.OS.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                          <div className="p-5 flex flex-col gap-1.5 bg-blue-50/30">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", eyeMutedLabelClass("OD"))}>OD - NEAR</span>
                            <span className={cn("text-lg font-black font-mono tracking-tighter", eyeValueClass("OD"))}>
                              {refractionData?.acceptance?.near?.OD ?
                                `${refractionData.acceptance.near.OD.sphere || '+0.00'} / ${refractionData.acceptance.near.OD.cylinder || '0.00'} @ ${refractionData.acceptance.near.OD.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                          <div className="p-5 flex flex-col gap-1.5 bg-emerald-50/30">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", eyeMutedLabelClass("OS"))}>OS - NEAR</span>
                            <span className={cn("text-lg font-black font-mono tracking-tighter", eyeValueClass("OS"))}>
                              {refractionData?.acceptance?.near?.OS ?
                                `${refractionData.acceptance.near.OS.sphere || '+0.00'} / ${refractionData.acceptance.near.OS.cylinder || '0.00'} @ ${refractionData.acceptance.near.OS.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Editable Spectacles Power Table (Desktop) */}
                  <Card className="clinical-card group overflow-hidden mt-6">
                    <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-600 text-white shadow-md rounded-md"><Glasses className="w-5 h-5 shrink-0" /></div>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-600 mb-0.5">Clinical Optics</span>
                          <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-normal">Final Spectacles RX</h3>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => triggerPrint('glass')}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 h-9 px-4 rounded-none shadow-md shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print RX
                      </Button>
                    </div>
                    <div className="p-6">
                      <div className="space-y-6 pb-6 mb-6 border-b border-orange-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest block">Prescribed Lens Architecture</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {[
                              { label: "Single Vision (SVN)", value: "SVN" },
                              { label: "Bifocals (KBF)", value: "KBF" },
                              { label: "Progressive (PAL)", value: "PAL" },
                              { label: "Double D Bifocal (DBF)", value: "DBF" },
                              { label: "Reading Glass", value: "READING" }
                            ].map((opt) => {
                              const isSelected = (glassPrescription.glassType || "SVN") === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setGlassPrescription(p => ({ ...p, glassType: opt.value }))}
                                  className={cn(
                                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none",
                                    isSelected
                                      ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                      : "bg-white text-slate-400 border-slate-100 hover:border-orange-200 hover:text-orange-600"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>


                        <div className="space-y-2 mt-4">
                          <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest block">Lens Usage Instruction</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {[
                              { label: "Constant Wear", value: "Constant Wear" },
                              { label: "Near Wear Only", value: "Near Wear Only" },
                              { label: "Distance Wear Only", value: "Distance Wear Only" },
                              { label: "Reading Only", value: "Reading Only" },
                              { label: "Constant Wear for DV, Reading Only for NV", value: "Constant Wear for DV, Reading Only for NV" }
                            ].map((opt) => {
                              const isSelected = (glassPrescription.instruction || "Constant Wear") === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setGlassPrescription(p => ({ ...p, instruction: opt.value }))}
                                  className={cn(
                                    "px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all border border-slate-250 rounded-none",
                                    isSelected
                                      ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                      : "bg-white text-slate-500 hover:border-orange-200 hover:text-orange-600"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block space-y-6">
                        <div className="overflow-hidden border border-slate-200">
                          <Table className="font-mono">
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-slate-200 bg-white">
                                <TableHead rowSpan={2} className="w-[90px] align-middle border-r border-slate-200 bg-white text-center text-[11px] font-black uppercase tracking-widest text-slate-600">Vision</TableHead>
                                <TableHead className="h-12 border-r border-slate-200 bg-white px-3" colSpan={4}>
                                  <EyeIndicator eye="OD" compact tableHeader />
                                </TableHead>
                                <TableHead className="h-12 bg-white px-3" colSpan={4}>
                                  <EyeIndicator eye="OS" compact tableHeader />
                                </TableHead>
                              </TableRow>
                              <TableRow className="hover:bg-orange-600 border-b border-orange-500/40 bg-orange-600">
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest h-9 bg-orange-600">SPH</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600">CYL</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600">AXIS</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest border-r border-orange-500/40 bg-orange-600">VA</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">SPH</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">CYL</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">AXIS</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">VA</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="h-16 bg-white">
                                <TableCell className="pl-4 border-r border-slate-100"><span className="text-[11px] font-black uppercase tracking-widest text-slate-500">DV</span></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={glassPrescription.distance.OD.sphere} onChange={val => updateGlassPrescription('distance', 'OD', 'sphere', val)} label="OD DV SPH" type="sph" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={glassPrescription.distance.OD.cylinder} onChange={val => updateGlassPrescription('distance', 'OD', 'cylinder', val)} label="OD DV CYL" type="cyl" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={glassPrescription.distance.OD.axis} onChange={val => updateGlassPrescription('distance', 'OD', 'axis', val)} label="OD DV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-blue-50/30 border-r border-orange-200"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-blue-100 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-blue-700" value={glassPrescription.distance.OD.vn || ""} onChange={val => updateGlassPrescription('distance', 'OD', 'vn', val)} placeholder="6/6" label="OD DV VA" type="dv" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={glassPrescription.distance.OS.sphere} onChange={val => updateGlassPrescription('distance', 'OS', 'sphere', val)} label="OS DV SPH" type="sph" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={glassPrescription.distance.OS.cylinder} onChange={val => updateGlassPrescription('distance', 'OS', 'cylinder', val)} label="OS DV CYL" type="cyl" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={glassPrescription.distance.OS.axis} onChange={val => updateGlassPrescription('distance', 'OS', 'axis', val)} label="OS DV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-emerald-50/30"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 focus:border-emerald-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-emerald-700" value={glassPrescription.distance.OS.vn || ""} onChange={val => updateGlassPrescription('distance', 'OS', 'vn', val)} placeholder="6/6" label="OS DV VA" type="dv" /></TableCell>
                              </TableRow>
                              <TableRow className="h-16 bg-orange-50/30">
                                <TableCell className="pl-4 border-r border-slate-100"><span className="text-[11px] font-black uppercase tracking-widest text-orange-600">NV</span></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={glassPrescription.near.OD.sphere} onChange={val => updateGlassPrescription('near', 'OD', 'sphere', val)} placeholder="0.00" label="OD NV SPH" type="sph" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={glassPrescription.near.OD.cylinder} onChange={val => updateGlassPrescription('near', 'OD', 'cylinder', val)} label="OD NV CYL" type="cyl" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={glassPrescription.near.OD.axis} onChange={val => updateGlassPrescription('near', 'OD', 'axis', val)} label="OD NV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-blue-50/30 border-r border-orange-200"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-blue-100 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-blue-700" value={glassPrescription.near.OD.vn || ""} onChange={val => updateGlassPrescription('near', 'OD', 'vn', val)} placeholder="N6" label="OD NV VA" type="nv" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={glassPrescription.near.OS.sphere} onChange={val => updateGlassPrescription('near', 'OS', 'sphere', val)} placeholder="0.00" label="OS NV SPH" type="sph" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={glassPrescription.near.OS.cylinder} onChange={val => updateGlassPrescription('near', 'OS', 'cylinder', val)} label="OS NV CYL" type="cyl" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={glassPrescription.near.OS.axis} onChange={val => updateGlassPrescription('near', 'OS', 'axis', val)} label="OS NV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-emerald-50/30"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 focus:border-emerald-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-emerald-700" value={glassPrescription.near.OS.vn || ""} onChange={val => updateGlassPrescription('near', 'OS', 'vn', val)} placeholder="N6" label="OS NV VA" type="nv" /></TableCell>
                              </TableRow>
                              <TableRow className="h-14 bg-slate-50/60">
                                <TableCell className="pl-4 border-r border-slate-100"><span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Dist PD</span></TableCell>
                                <TableCell colSpan={2}><PowerPaletteInput className="h-10 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-blue-600 focus:ring-0 transition-all" value={glassPrescription.distPD?.OD || ""} onChange={val => setGlassPrescription(p => ({ ...p, distPD: { OD: val, OS: p.distPD?.OS || "" } }))} placeholder="32" label="OD Dist PD" type="pd" /></TableCell>
                                <TableCell className="text-center text-[10px] font-black text-blue-500 uppercase tracking-widest">mm</TableCell>
                                <TableCell className="border-r border-slate-200"></TableCell>
                                <TableCell colSpan={2}><PowerPaletteInput className="h-10 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-emerald-600 focus:ring-0 transition-all" value={glassPrescription.distPD?.OS || ""} onChange={val => setGlassPrescription(p => ({ ...p, distPD: { OD: p.distPD?.OD || "", OS: val } }))} placeholder="32" label="OS Dist PD" type="pd" /></TableCell>
                                <TableCell className="text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest">mm</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                              <TableRow className="h-14 bg-slate-50/60">
                                <TableCell className="pl-4 border-r border-slate-100"><span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Near PD</span></TableCell>
                                <TableCell colSpan={2}><PowerPaletteInput className="h-10 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-blue-600 focus:ring-0 transition-all" value={glassPrescription.nearPD?.OD || ""} onChange={val => setGlassPrescription(p => ({ ...p, nearPD: { OD: val, OS: p.nearPD?.OS || "" } }))} placeholder="30" label="OD Near PD" type="pd" /></TableCell>
                                <TableCell className="text-center text-[10px] font-black text-blue-500 uppercase tracking-widest">mm</TableCell>
                                <TableCell className="border-r border-slate-200"></TableCell>
                                <TableCell colSpan={2}><PowerPaletteInput className="h-10 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-emerald-600 focus:ring-0 transition-all" value={glassPrescription.nearPD?.OS || ""} onChange={val => setGlassPrescription(p => ({ ...p, nearPD: { OD: p.nearPD?.OD || "", OS: val } }))} placeholder="30" label="OS Near PD" type="pd" /></TableCell>
                                <TableCell className="text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest">mm</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Editable Power List (Mobile) */}
                      <div className="md:hidden space-y-8 mt-4">
                        {["OD", "OS"].map((eye) => (
                          <div key={eye} className="space-y-4">
                            <EyeIndicator eye={eye as "OD" | "OS"} />

                            <div className="grid grid-cols-4 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(glassPrescription.distance as any)[eye].sphere}
                                  onChange={val => updateGlassPrescription('distance', eye as any, 'sphere', val)}
                                  label={`${eye} DV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(glassPrescription.distance as any)[eye].cylinder}
                                  onChange={val => updateGlassPrescription('distance', eye as any, 'cylinder', val)}
                                  label={`${eye} DV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(glassPrescription.distance as any)[eye].axis}
                                  onChange={val => updateGlassPrescription('distance', eye as any, 'axis', val)}
                                  label={`${eye} DV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={cn("text-[10px] font-black uppercase", eye === "OD" ? "text-blue-600" : "text-emerald-600")}>DV (VA)</label>
                                <PowerPaletteInput
                                  className={cn(
                                    "h-11 text-center text-sm font-black rounded-none",
                                    eye === "OD"
                                      ? "bg-blue-50/30 border-blue-100 text-blue-700"
                                      : "bg-emerald-50/30 border-emerald-100 text-emerald-700"
                                  )}
                                  value={(glassPrescription.distance as any)[eye].vn || ""}
                                  onChange={val => updateGlassPrescription('distance', eye as any, 'vn', val)}
                                  placeholder="6/6"
                                  label={`${eye} DV (VA)`}
                                  type="dv"
                                />
                              </div>
                            </div>
                            <div className="pt-2 grid grid-cols-4 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(glassPrescription.near as any)[eye].sphere}
                                  onChange={val => updateGlassPrescription('near', eye as any, 'sphere', val)}
                                  placeholder="0.00"
                                  label={`${eye} NV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(glassPrescription.near as any)[eye].cylinder}
                                  onChange={val => updateGlassPrescription('near', eye as any, 'cylinder', val)}
                                  label={`${eye} NV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(glassPrescription.near as any)[eye].axis}
                                  onChange={val => updateGlassPrescription('near', eye as any, 'axis', val)}
                                  label={`${eye} NV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={cn("text-[10px] font-black uppercase", eye === "OD" ? "text-blue-600" : "text-emerald-600")}>NV (VA)</label>
                                <PowerPaletteInput
                                  className={cn(
                                    "h-11 text-center font-black rounded-none",
                                    eye === "OD"
                                      ? "bg-blue-50/30 border-blue-100 text-blue-700"
                                      : "bg-emerald-50/30 border-emerald-100 text-emerald-700"
                                  )}
                                  value={(glassPrescription.near as any)[eye].vn || ""}
                                  onChange={val => updateGlassPrescription('near', eye as any, 'vn', val)}
                                  placeholder="N6"
                                  label={`${eye} NV (VA)`}
                                  type="nv"
                                />
                              </div>
                            </div>
                            <div className="pt-2 grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Dist PD (mm)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-white rounded-none border-slate-200"
                                  value={glassPrescription.distPD?.[eye as "OD" | "OS"] || ""}
                                  onChange={val => setGlassPrescription(p => ({ ...p, distPD: { OD: p.distPD?.OD || "", OS: p.distPD?.OS || "", [eye]: val } }))}
                                  placeholder="32"
                                  label={`${eye} Dist PD`}
                                  type="iop"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Near PD (mm)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-white rounded-none border-slate-200"
                                  value={glassPrescription.nearPD?.[eye as "OD" | "OS"] || ""}
                                  onChange={val => setGlassPrescription(p => ({ ...p, nearPD: { OD: p.nearPD?.OD || "", OS: p.nearPD?.OS || "", [eye]: val } }))}
                                  placeholder="30"
                                  label={`${eye} Near PD`}
                                  type="iop"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end gap-4 mt-6">
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest italic">
                          Values from Acceptance are synced automatically if no overrides are provided.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Editable Contact Lens Power Table (Desktop) */}
                  <Card className="clinical-card group overflow-hidden mt-6">
                    <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-600 text-white shadow-md rounded-md"><Eye className="w-5 h-5 shrink-0" /></div>
                        <div className="flex flex-col">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-600 mb-0.5">Clinical Optics</span>
                          <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-normal">Final Contact Lens RX</h3>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => triggerPrint('glass')}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase text-[10px] tracking-wider flex items-center gap-2 h-9 px-4 rounded-none shadow-md shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print RX
                      </Button>
                    </div>
                    <div className="p-6">
                      <div className="space-y-6 pb-6 mb-6 border-b border-orange-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest block">Prescribed Contact Lens Type</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {["Soft CL", "RGP", "Scleral"].map((type) => {
                              const currentTypes = Array.isArray(contactLensPrescription.clType) ? contactLensPrescription.clType : [];
                              const isSelected = currentTypes.includes(type);
                              const isDisabled = type === "RGP" || type === "Scleral";
                              return (
                                <button key={type} type="button" disabled={isDisabled} onClick={() => {
                                  const nextTypes = isSelected ? currentTypes.filter(t => t !== type) : [...currentTypes, type];
                                  setContactLensPrescription(p => ({ ...p, clType: nextTypes }));
                                }} className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none", isSelected ? "bg-orange-600 text-white border-orange-600 shadow-md" : "bg-white text-slate-400 border-slate-100 hover:border-orange-200 hover:text-orange-600", isDisabled && "opacity-50 cursor-not-allowed hover:border-slate-100 hover:text-slate-400")}>{type}</button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {/* Editable Contact Lens Power Table (Desktop) */}
                      <div className="hidden md:block space-y-6">
                        <div className="overflow-hidden border border-slate-200">
                          <Table className="font-mono">
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-slate-200 bg-white">
                                <TableHead rowSpan={2} className="w-[90px] align-middle border-r border-slate-200 bg-white text-center text-[11px] font-black uppercase tracking-widest text-slate-600">Vision</TableHead>
                                <TableHead className="h-12 border-r border-slate-200 bg-white px-3" colSpan={4}>
                                  <EyeIndicator eye="OD" compact tableHeader />
                                </TableHead>
                                <TableHead className="h-12 bg-white px-3" colSpan={4}>
                                  <EyeIndicator eye="OS" compact tableHeader />
                                </TableHead>
                              </TableRow>
                              <TableRow className="hover:bg-orange-600 border-b border-orange-500/40 bg-orange-600">
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest h-9 bg-orange-600">SPH</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600">CYL</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600">AXIS</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest border-r border-orange-500/40 bg-orange-600">VA</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">SPH</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">CYL</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">AXIS</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[11px] tracking-widest bg-orange-600/80">VA</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="h-16 bg-white">
                                <TableCell className="pl-4 border-r border-slate-100"><span className="text-[11px] font-black uppercase tracking-widest text-slate-500">DV</span></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={contactLensPrescription.distance.OD.sphere} onChange={val => updateContactLensPrescription('distance', 'OD', 'sphere', val)} label="OD DV SPH" type="sph" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={contactLensPrescription.distance.OD.cylinder} onChange={val => updateContactLensPrescription('distance', 'OD', 'cylinder', val)} label="OD DV CYL" type="cyl" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={contactLensPrescription.distance.OD.axis} onChange={val => updateContactLensPrescription('distance', 'OD', 'axis', val)} label="OD DV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-blue-50/30 border-r border-orange-200"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-blue-100 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-blue-700" value={contactLensPrescription.distance.OD.vn || ""} onChange={val => updateContactLensPrescription('distance', 'OD', 'vn', val)} placeholder="6/6" label="OD DV VA" type="dv" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={contactLensPrescription.distance.OS.sphere} onChange={val => updateContactLensPrescription('distance', 'OS', 'sphere', val)} label="OS DV SPH" type="sph" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={contactLensPrescription.distance.OS.cylinder} onChange={val => updateContactLensPrescription('distance', 'OS', 'cylinder', val)} label="OS DV CYL" type="cyl" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={contactLensPrescription.distance.OS.axis} onChange={val => updateContactLensPrescription('distance', 'OS', 'axis', val)} label="OS DV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-emerald-50/30"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 focus:border-emerald-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-emerald-700" value={contactLensPrescription.distance.OS.vn || ""} onChange={val => updateContactLensPrescription('distance', 'OS', 'vn', val)} placeholder="6/6" label="OS DV VA" type="dv" /></TableCell>
                              </TableRow>
                              <TableRow className="h-16 bg-orange-50/30">
                                <TableCell className="pl-4 border-r border-slate-100"><span className="text-[11px] font-black uppercase tracking-widest text-orange-600">NV</span></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={contactLensPrescription.near.OD.sphere} onChange={val => updateContactLensPrescription('near', 'OD', 'sphere', val)} placeholder="0.00" label="OD NV SPH" type="sph" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={contactLensPrescription.near.OD.cylinder} onChange={val => updateContactLensPrescription('near', 'OD', 'cylinder', val)} label="OD NV CYL" type="cyl" /></TableCell>
                                <TableCell><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={contactLensPrescription.near.OD.axis} onChange={val => updateContactLensPrescription('near', 'OD', 'axis', val)} label="OD NV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-blue-50/30 border-r border-orange-200"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-blue-100 focus:border-blue-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-blue-700" value={contactLensPrescription.near.OD.vn || ""} onChange={val => updateContactLensPrescription('near', 'OD', 'vn', val)} placeholder="N6" label="OD NV VA" type="nv" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={contactLensPrescription.near.OS.sphere} onChange={val => updateContactLensPrescription('near', 'OS', 'sphere', val)} placeholder="0.00" label="OS NV SPH" type="sph" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={contactLensPrescription.near.OS.cylinder} onChange={val => updateContactLensPrescription('near', 'OS', 'cylinder', val)} label="OS NV CYL" type="cyl" /></TableCell>
                                <TableCell className="bg-orange-50/10"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all" value={contactLensPrescription.near.OS.axis} onChange={val => updateContactLensPrescription('near', 'OS', 'axis', val)} label="OS NV AXIS" type="axis" /></TableCell>
                                <TableCell className="bg-emerald-50/30"><PowerPaletteInput className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 focus:border-emerald-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all text-emerald-700" value={contactLensPrescription.near.OS.vn || ""} onChange={val => updateContactLensPrescription('near', 'OS', 'vn', val)} placeholder="N6" label="OS NV VA" type="nv" /></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Editable Contact Lens Power List (Mobile) */}
                      <div className="md:hidden space-y-8 mt-4">
                        {["OD", "OS"].map((eye) => (
                          <div key={eye} className="space-y-4">
                            <EyeIndicator eye={eye as "OD" | "OS"} />

                            <div className="grid grid-cols-4 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(contactLensPrescription.distance as any)[eye].sphere}
                                  onChange={val => updateContactLensPrescription('distance', eye as any, 'sphere', val)}
                                  label={`${eye} DV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(contactLensPrescription.distance as any)[eye].cylinder}
                                  onChange={val => updateContactLensPrescription('distance', eye as any, 'cylinder', val)}
                                  label={`${eye} DV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(contactLensPrescription.distance as any)[eye].axis}
                                  onChange={val => updateContactLensPrescription('distance', eye as any, 'axis', val)}
                                  label={`${eye} DV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={cn("text-[10px] font-black uppercase", eye === "OD" ? "text-blue-600" : "text-emerald-600")}>DV (VA)</label>
                                <PowerPaletteInput
                                  className={cn(
                                    "h-11 text-center text-sm font-black rounded-none",
                                    eye === "OD"
                                      ? "bg-blue-50/30 border-blue-100 text-blue-700"
                                      : "bg-emerald-50/30 border-emerald-100 text-emerald-700"
                                  )}
                                  value={(contactLensPrescription.distance as any)[eye].vn || ""}
                                  onChange={val => updateContactLensPrescription('distance', eye as any, 'vn', val)}
                                  placeholder="6/6"
                                  label={`${eye} DV (VA)`}
                                  type="dv"
                                />
                              </div>
                            </div>
                            <div className="pt-2 grid grid-cols-4 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(contactLensPrescription.near as any)[eye].sphere}
                                  onChange={val => updateContactLensPrescription('near', eye as any, 'sphere', val)}
                                  placeholder="0.00"
                                  label={`${eye} NV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(contactLensPrescription.near as any)[eye].cylinder}
                                  onChange={val => updateContactLensPrescription('near', eye as any, 'cylinder', val)}
                                  label={`${eye} NV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(contactLensPrescription.near as any)[eye].axis}
                                  onChange={val => updateContactLensPrescription('near', eye as any, 'axis', val)}
                                  label={`${eye} NV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={cn("text-[10px] font-black uppercase", eye === "OD" ? "text-blue-600" : "text-emerald-600")}>NV (VA)</label>
                                <PowerPaletteInput
                                  className={cn(
                                    "h-11 text-center font-black rounded-none",
                                    eye === "OD"
                                      ? "bg-blue-50/30 border-blue-100 text-blue-700"
                                      : "bg-emerald-50/30 border-emerald-100 text-emerald-700"
                                  )}
                                  value={(contactLensPrescription.near as any)[eye].vn || ""}
                                  onChange={val => updateContactLensPrescription('near', eye as any, 'vn', val)}
                                  placeholder="N6"
                                  label={`${eye} NV (VA)`}
                                  type="nv"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </Card>
                </div>
              </fieldset>
            </TabsContent>

            {/* 6. Medical Prescription */}
            <TabsContent value="medical" className=" p-8 outline-none">
              <fieldset disabled={isLocked} className="contents">
                <div className="max-w-6xl mx-auto space-y-10 mb-12">
                  {isLocked && (
                    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex items-center gap-4 shadow-sm animate-pulse-slow">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="text-sm font-black text-orange-600 uppercase">Medical Rx Locked</h4>
                        <p className="text-xs font-bold text-orange-600">Medication entry is only permitted after starting the patient consultation.</p>
                      </div>
                    </div>
                  )}
                  <Card className="clinical-card bg-white shadow-md overflow-hidden border border-slate-200">
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <SectionHeader icon={Pill} category="Clinical Pharmacy" title="Drug Prescription Portfolio" />
                      <Button size="lg" className="h-14 gap-3 font-black bg-orange-600 hover:bg-black rounded-none px-8 tracking-widest shadow-xl uppercase w-full sm:w-auto" onClick={addMedication}>
                        <Plus className="w-5 h-5 border-2 border-white rounded-full" /> New Medication
                      </Button>
                    </div>
                    <div className="p-0">
                      {/* Desktop View (Table) */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50 border-b-2 border-slate-100">
                            <TableRow className="h-16 hover:bg-transparent">
                              <TableHead className="w-16 text-center text-[12px] font-black uppercase tracking-widest text-slate-400">#</TableHead>
                              <TableHead className="min-w-[280px] text-[12px] font-black uppercase tracking-widest text-orange-600">Drug / Formula Name</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Dosage</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Route</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Frequency</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Duration</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Eye / Food Timing</TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {medications.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-24 text-slate-300">
                                  <div className="flex flex-col items-center gap-4">
                                    <Pill className="w-12 h-12 opacity-10" />
                                    <p className="font-bold uppercase tracking-[0.3em] text-xs">No active prescriptions for this visit</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : medications.map((med, index) => (
                              <TableRow key={med.id} className="group hover:bg-orange-50/50 transition-colors">
                                <TableCell className="text-center font-black text-slate-300 py-4 align-top">{index + 1}</TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input
                                    readOnly
                                    className="h-12 text-sm font-black border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:bg-yellow-50/30 cursor-pointer transition-all"
                                    value={med.drug}
                                    placeholder="Hover row to select from catalog"
                                  />
                                  {renderDrugInventoryChips(med.id, med.drug, "max-w-[280px]")}
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.dosage} onChange={e => updateMedication(med.id, "dosage", e.target.value)} placeholder="1 Drop" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-1.5 focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out max-w-[120px]">
                                    {["1 Drop", "2 Drops", "1 Tab", "1 Cap"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "dosage", p)}
                                        className="text-[9px] font-bold text-slate-800 hover:text-white bg-white hover:bg-slate-800 border border-slate-300 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <div className="flex items-center gap-1.5 min-w-[140px]">
                                    <button
                                      type="button"
                                      onClick={() => updateMedication(med.id, "route", "Topical")}
                                      className={cn(
                                        "px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-12 flex items-center justify-center",
                                        med.route === "Topical"
                                          ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                      )}
                                    >
                                      Topical
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateMedication(med.id, "route", "Oral")}
                                      className={cn(
                                        "px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-12 flex items-center justify-center",
                                        med.route === "Oral"
                                          ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                      )}
                                    >
                                      Oral
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.frequency} onChange={e => updateMedication(med.id, "frequency", e.target.value)} placeholder="QID (4 times)" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-1.5 focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out max-w-[140px]">
                                    {[
                                      { label: "QID", value: "QID (4 times)" },
                                      { label: "TID", value: "TID (3 times)" },
                                      { label: "BD", value: "BD (2 times)" },
                                      { label: "OD", value: "OD (Once daily)" },
                                      { label: "2hrly", value: "Every 2 Hours" },
                                    ].map(p => (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "frequency", p.value)}
                                        className="text-[9px] font-bold text-slate-800 hover:text-white bg-white hover:bg-slate-800 border border-slate-300 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white font-mono focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.duration} onChange={e => updateMedication(med.id, "duration", e.target.value)} placeholder="5 Days" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-1.5 focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out max-w-[120px]">
                                    {["5 Days", "7 Days", "10 Days", "15 Days", "1 Mo"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "duration", p)}
                                        className="text-[9px] font-bold text-slate-800 hover:text-white bg-white hover:bg-slate-800 border border-slate-300 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  {med.route === "Oral" ? (
                                    <div className="flex items-center gap-1.5 min-w-[160px]">
                                      {[
                                        { label: "Before Food", value: "Before Food" },
                                        { label: "After Food", value: "After Food" },
                                      ].map(p => (
                                        <button
                                          key={p.value}
                                          type="button"
                                          onClick={() => updateMedication(med.id, "foodRelation", p.value)}
                                          className={cn(
                                            "px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-12 flex items-center justify-center",
                                            med.foodRelation === p.value
                                              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                              : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                          )}
                                        >
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 min-w-[140px]">
                                      {[
                                        { label: "RE", value: "Right", title: "Right Eye (OD)" },
                                        { label: "LE", value: "Left", title: "Left Eye (OS)" },
                                        { label: "BE", value: "Both", title: "Both Eyes (OU)" },
                                      ].map(p => (
                                        <button
                                          key={p.value}
                                          type="button"
                                          title={p.title}
                                          onClick={() => updateMedication(med.id, "eye", p.value)}
                                          className={cn(
                                            "px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-12 flex items-center justify-center",
                                            med.eye === p.value
                                              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                              : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                          )}
                                        >
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-12 w-12 text-slate-300 hover:text-red-600 hover:bg-orange-50 transition-all" onClick={() => removeMedication(med.id)}>
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile View (Card List) */}
                      <div className="md:hidden divide-y divide-slate-100">
                        {medications.length === 0 ? (
                          <div className="text-center py-16 text-slate-300 px-6">
                            <Pill className="w-12 h-12 opacity-10 mx-auto mb-4" />
                            <p className="font-bold uppercase tracking-[0.2em] text-[12px]">No active prescriptions</p>
                          </div>
                        ) : medications.map((med, index) => (
                          <div key={med.id} className="p-4 space-y-4 bg-white relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5">DRUG #{index + 1}</span>
                              <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-300 hover:text-red-600 p-0" onClick={() => removeMedication(med.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <div className="group">
                                <Input
                                  readOnly
                                  className="h-12 text-sm font-black border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-slate-50/30 cursor-pointer"
                                  value={med.drug}
                                  placeholder="Tap field to select from catalog"
                                />
                                {renderDrugInventoryChips(med.id, med.drug)}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Dosage</label>
                                  <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.dosage} onChange={e => updateMedication(med.id, "dosage", e.target.value)} placeholder="Dosage" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden focus-within:max-h-16 focus-within:opacity-100 focus-within:mt-1 transition-all duration-200 ease-out">
                                    {["1 Drop", "2 Drops", "1 Tab", "1 Cap"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "dosage", p)}
                                        className="text-[8px] font-bold text-slate-800 hover:text-white bg-white hover:bg-slate-800 border border-slate-300 px-1 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Duration</label>
                                  <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.duration} onChange={e => updateMedication(med.id, "duration", e.target.value)} placeholder="Duration" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden focus-within:max-h-16 focus-within:opacity-100 focus-within:mt-1 transition-all duration-200 ease-out">
                                    {["5 Days", "7 Days", "10 Days", "15 Days", "1 Mo"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "duration", p)}
                                        className="text-[8px] font-bold text-slate-800 hover:text-white bg-white hover:bg-slate-800 border border-slate-300 px-1 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Frequency</label>
                                  <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.frequency} onChange={e => updateMedication(med.id, "frequency", e.target.value)} placeholder="Frequency" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1 transition-all duration-200 ease-out">
                                    {[
                                      { label: "QID", value: "QID (4 times)" },
                                      { label: "TID", value: "TID (3 times)" },
                                      { label: "BD", value: "BD (2 times)" },
                                      { label: "OD", value: "OD (Once daily)" },
                                      { label: "2hrly", value: "Every 2 Hours" },
                                    ].map(p => (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "frequency", p.value)}
                                        className="text-[8px] font-bold text-slate-800 hover:text-white bg-white hover:bg-slate-800 border border-slate-300 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">
                                    {med.route === "Oral" ? "Food Timing" : "Eye"}
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    {med.route === "Oral" ? (
                                      [
                                        { label: "Before", value: "Before Food" },
                                        { label: "After", value: "After Food" },
                                      ].map(p => (
                                        <button
                                          key={p.value}
                                          type="button"
                                          onClick={() => updateMedication(med.id, "foodRelation", p.value)}
                                          className={cn(
                                            "px-2 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-10 flex items-center justify-center",
                                            med.foodRelation === p.value
                                              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                              : "bg-white text-slate-500 border-slate-200 hover:border-orange-400"
                                          )}
                                        >
                                          {p.label}
                                        </button>
                                      ))
                                    ) : (
                                      [
                                        { label: "RE", value: "Right" },
                                        { label: "LE", value: "Left" },
                                        { label: "BE", value: "Both" },
                                      ].map(p => (
                                        <button
                                          key={p.value}
                                          type="button"
                                          onClick={() => updateMedication(med.id, "eye", p.value)}
                                          className={cn(
                                            "px-2 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-10 flex items-center justify-center",
                                            med.eye === p.value
                                              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                              : "bg-white text-slate-500 border-slate-200 hover:border-orange-400"
                                          )}
                                        >
                                          {p.label}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1.5 pt-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Route</label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateMedication(med.id, "route", "Topical")}
                                    className={cn(
                                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-10 flex items-center justify-center",
                                      med.route === "Topical"
                                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-orange-400"
                                    )}
                                  >
                                    Topical
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateMedication(med.id, "route", "Oral")}
                                    className={cn(
                                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-10 flex items-center justify-center",
                                      med.route === "Oral"
                                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-orange-400"
                                    )}
                                  >
                                    Oral
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-10 bg-orange-600/5 border-t-2 border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                          <label className="text-xs font-black uppercase tracking-widest text-orange-600">Special Administration Instructions</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { name: "Shake Well", text: "Shake well before use." },
                              { name: "5 Min Interval", text: "Keep a 5-minute interval between different eye drops." },
                              { name: "Avoid Contact", text: "Avoid touching the dropper tip to the eye or any surface to prevent contamination." },
                              { name: "Bedtime Ointment", text: "Apply eye ointment at bedtime (may cause temporary blurry vision)." },
                              { name: "Store Cool", text: "Store eye drops in a cool, dry place. Protect from direct light." },
                              { name: "Remove Contacts", text: "Remove contact lenses before instilling drops. Reinsert only after 15 minutes." }
                            ].map(tmpl => (
                              <button
                                key={tmpl.name}
                                type="button"
                                onClick={() => {
                                  const currentVal = investigation.adminInstructions || "";
                                  const newVal = currentVal ? `${currentVal}\n${tmpl.text}` : tmpl.text;
                                  updateInvestigation(['adminInstructions'], newVal);
                                }}
                                className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-white hover:bg-orange-50 text-slate-500 hover:text-orange-600 border border-slate-200 hover:border-orange-200 active:scale-95 transition-all rounded-none"
                              >
                                {tmpl.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          placeholder="Instructions for patient counseling or pharmacist (e.g. Shake well, Avoid light...)"
                          className="min-h-[120px] text-lg font-medium border-slate-200 rounded-none bg-white p-6 shadow-inner leading-relaxed"
                          value={investigation.adminInstructions}
                          onChange={e => updateInvestigation(['adminInstructions'], e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </fieldset>
            </TabsContent>

            <TabsContent value="followup" className="p-4 sm:p-6 outline-none">
              <div className="max-w-5xl mx-auto space-y-6">
                <Card className="clinical-card bg-white shadow-sm overflow-hidden border border-slate-200">
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
                    <SectionHeader icon={Calendar} category="Review & Scheduler" title="Follow-up Configuration" />
                  </div>

                  <div className="p-4 sm:p-6 space-y-6">
                    {/* Section 1: Current Status */}
                    <div className="bg-orange-50/40 border border-orange-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Current Follow-up Plan</span>
                        {investigation.followUpDate ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-orange-600">
                              Scheduled for {new Date(investigation.followUpDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <Badge className="bg-orange-600/10 text-orange-600 border border-orange-200/50 text-[10px] font-black uppercase px-2 h-5 rounded-none whitespace-nowrap shrink-0">
                              {investigation.followUpTimeFrame}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-500 italic">No follow-up currently scheduled for this patient.</span>
                        )}
                      </div>
                      {investigation.followUpDate && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setInvestigation(prev => ({
                              ...prev,
                              followUpDate: "",
                              followUpTimeFrame: ""
                            }));
                          }}
                          className="h-8 border-slate-200 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-none uppercase tracking-wider"
                        >
                          Clear Schedule
                        </Button>
                      )}
                    </div>

                    {/* Section 2: Review Details & Templates */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block">Review Details & Instructions</Label>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select templates to pre-fill</span>
                      </div>

                      {/* Templates Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[
                          { name: "Refractive Review", text: "Refractive Error Review: Assess spectacle adaptation, visual comfort, and repeat subjective refraction check.", time: "6 Months" },
                          { name: "Dry Eye Follow-up", text: "Dry Eye Syndrome Evaluation: Review symptom relief, assess tear film break-up time (TBUT), and adjust lubricant frequency.", time: "1 Month" },
                          { name: "Glaucoma Monitor", text: "Glaucoma Suspect Review: Perform Goldmann applanation tonometry (IOP check) and review visual field / OCT reports.", time: "3 Months" },
                          { name: "Diabetic Retinopathy", text: "Diabetic Fundus Evaluation: Conduct dilated fundus examination to monitor for NPDR progression or macular edema.", time: "6 Months" },
                          { name: "Post-op Assessment", text: "Post-operative Check: Inspect surgical wound, check intraocular pressure, examine anterior chamber for inflammation.", time: "1 Week" },
                          { name: "Allergy Review", text: "Allergic Conjunctivitis Review: Check resolution of conjunctival congestion, check for giant papillae, adjust steroid/antihistamine drops.", time: "2 Weeks" },
                          { name: "Blepharitis Check", text: "Blepharitis Follow-up: Inspect meibomian gland expression, evaluate lid hygiene compliance, check for secondary infection.", time: "3 Weeks" }
                        ].map(tmpl => (
                          <button
                            key={tmpl.name}
                            type="button"
                            onClick={() => {
                              updateInvestigation(['opinion'], tmpl.text);
                              selectFollowUpTimeFrame(tmpl.time);
                            }}
                            className="p-3 text-left border border-slate-200 hover:border-orange-400 hover:bg-orange-50/30 transition-all duration-200 bg-slate-50/30 active:scale-[0.98] rounded-sm"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-700">{tmpl.name}</span>
                              <Badge className="bg-orange-600/10 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded-none">{tmpl.time}</Badge>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{tmpl.text}</p>
                          </button>
                        ))}
                      </div>

                      <Textarea
                        placeholder="Provide specific instructions or reason for the review visit..."
                        className="min-h-[140px] text-base font-medium rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 p-5 leading-relaxed bg-white"
                        value={investigation.opinion}
                        onChange={e => updateInvestigation(['opinion'], e.target.value)}
                      />
                    </div>

                    {/* Section 3: Timeframe Picker */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block">Assign Follow-up Interval</Label>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Specific Date Picker</span>
                          <input
                            type="date"
                            value={investigation.followUpDate || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInvestigation(prev => ({
                                ...prev,
                                followUpDate: val,
                                followUpTimeFrame: val ? "Custom Date" : ""
                              }));
                            }}
                            className="h-9 px-3 border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-orange-600"
                          />
                        </div>
                      </div>

                      {/* Standard Presets */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Quick Presets</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                          {[
                            { name: "3 Days", value: "3 Days" },
                            { name: "5 Days", value: "5 Days" },
                            { name: "1 Week", value: "1 Week" },
                            { name: "2 Weeks", value: "2 Weeks" },
                            { name: "3 Weeks", value: "3 Weeks" },
                            { name: "1 Month", value: "1 Month" },
                            { name: "3 Months", value: "3 Months" },
                            { name: "6 Months", value: "6 Months" }
                          ].map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => selectFollowUpTimeFrame(option.value)}
                              className={cn(
                                "px-3 py-2 text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 rounded-none text-center",
                                investigation.followUpTimeFrame === option.value
                                  ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                              )}
                            >
                              {option.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* 7. Case Record (History) */}
            <TabsContent value="history" className=" p-8 outline-none">
              <div className="max-w-5xl mx-auto space-y-12 mb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-orange-600 uppercase tracking-normal flex items-center gap-2">
                      <History className="w-5 h-5 opacity-50 shrink-0" /> Patient Longitudinal Profile
                    </h3>
                    <p className="text-xs font-bold text-slate-400 pl-7">Total Clinical Footprint: {visitHistory.length} Comprehensive Visits</p>
                  </div>
                </div>

                {isLoadingHistory ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-none border border-slate-200" />)}
                  </div>
                ) : visitHistory.length === 0 ? (
                  <div className="bg-white p-24 rounded-none border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                    <FileText className="w-16 h-16 text-slate-200 mb-6" />
                    <h4 className="font-black text-2xl text-slate-400 uppercase tracking-tighter mb-2">Primary Admission</h4>
                    <p className="text-sm font-medium text-slate-400 max-w-xs">No historical records synchronized for this MR Number. This visit constitutes the patient's inaugural record.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {visitHistory.map((visit) => (
                      <div
                        key={visit.id}
                        className="group relative clinical-card !shadow-sm hover:shadow-xl hover:border-orange-600/20 border border-slate-100 transition-all cursor-pointer overflow-hidden"
                        onClick={() => {
                          setSelectedHistoricalVisit(visit);
                          setIsHistoryDetailsOpen(true);
                        }}
                      >
                        <div className="flex items-stretch min-h-[140px]">
                          <div className="w-1.5 sm:w-3 bg-slate-200 group-hover:bg-orange-600 transition-colors shrink-0" />
                          <div className="flex-1 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnostic Date</span>
                                <span className="text-xl sm:text-2xl font-black text-orange-600 tracking-tighter uppercase whitespace-nowrap">
                                  {new Date(visit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className="h-5 rounded-none bg-orange-50 text-orange-600 border-orange-200 font-black text-[10px] uppercase tracking-widest shrink-0">{visit.status}</Badge>
                                  <span className="text-[12px] font-mono text-slate-400 truncate md:hidden">ID: {(visit.id || "").substring(0, 8)}</span>
                                </div>
                              </div>

                              <Separator orientation="vertical" className="h-16 hidden md:block" />

                              <div className="hidden lg:flex flex-col gap-1">
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Medical Unit ID</span>
                                <span className="text-xs font-mono font-bold text-slate-600 tracking-wider">REF-{(visit.id || "VISIT").substring(0, 12).toUpperCase()}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:border-slate-0 w-full sm:w-auto">
                              <div className="text-left sm:text-right flex flex-col sm:items-end">
                                <p className="text-[12px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Lead Consultant</p>
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4 text-orange-500 sm:hidden" />
                                  <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight whitespace-nowrap">{visit.consultingDoctorName || visit.consultation?.doctorName || "Dr. Clinical Lead"}</p>
                                </div>
                              </div>
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-none border-2 border-slate-100 flex items-center justify-center group-hover:bg-orange-600 group-hover:border-orange-600 transition-all shrink-0">
                                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>


          </div>
        </Tabs>
      </div>

      <Dialog open={isHistoryDetailsOpen} onOpenChange={(open) => {
        setIsHistoryDetailsOpen(open);
        if (!open) setSelectedHistoricalVisit(null);
      }}>
        <DialogContent className="print:hidden no-print max-w-[95vw] w-[1200px] h-[85vh] p-0 overflow-hidden bg-slate-50 flex flex-col rounded-xl border border-slate-200 shadow-2xl">
          <DialogTitle className="sr-only">Doctor Report</DialogTitle>
          {selectedHistoricalVisit && (
            <ConsultationSummaryView 
              selectedHistoricalVisit={selectedHistoricalVisit} 
              patient={patient} 
              triggerPrint={triggerPrint} 
            />
          )}
          {selectedHistoricalVisit && (() => {
            // Print layout is handled by the portal-based print section below.
            // This block intentionally renders nothing for print.
            return null;
          })()}

        </DialogContent>
      </Dialog>

      {/* 4. Family Patient Longitudinal Profile Dialog */}
      <Dialog
        open={!!selectedFamilyPatient}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFamilyPatient(null);
            setFamilyPatientHistory([]);
          }
        }}
      >
        <DialogContent className="print:hidden no-print max-w-[95vw] w-[1100px] h-[80vh] p-0 overflow-hidden bg-slate-50 flex flex-col rounded-xl border border-slate-200 shadow-2xl">
          <DialogTitle className="sr-only">Family Patient Profile</DialogTitle>
          {selectedFamilyPatient && (
            <>
              <DialogHeader className="bg-white border-b border-slate-200 p-5 shrink-0 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-base uppercase">
                    {selectedFamilyPatient.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <span>{selectedFamilyPatient.name}</span>
                      <Badge className="bg-orange-600 text-white text-[9px] font-black h-4.5 uppercase px-2 rounded-none">
                        MRN: {selectedFamilyPatient.mrNumber}
                      </Badge>
                      {selectedFamilyPatient.familyMaps?.[0]?.relationshipType && (
                        <Badge className="bg-blue-600 text-white text-[9px] font-black h-4.5 uppercase px-2 rounded-none">
                          {formatRelationship(selectedFamilyPatient.familyMaps[0].relationshipType, selectedFamilyPatient.gender)}
                        </Badge>
                      )}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {getPatientGenderString(selectedFamilyPatient)} • {getPatientAgeString(selectedFamilyPatient)} • Contact: {selectedFamilyPatient.contactNumber}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Past Visits History */}
                <div className="lg:col-span-2 print:col-span-3 space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <History className="w-3.5 h-3.5 text-slate-400" /> Longitudinal Visit Records
                  </h3>

                  {loadingFamilyPatientHistory ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-slate-100 animate-pulse border border-slate-200 rounded-lg" />
                      ))}
                    </div>
                  ) : familyPatientHistory.length === 0 ? (
                    <div className="bg-white p-12 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center rounded-xl">
                      <FileText className="w-10 h-10 text-slate-305 mb-3" />
                      <h4 className="font-black text-sm text-slate-400 uppercase tracking-tighter mb-1">No Clinical History</h4>
                      <p className="text-xs text-slate-400 max-w-xs">There are no documented past visits for this MRN in our database.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {familyPatientHistory.map((visit) => (
                        <div
                          key={visit.id}
                          className="group relative bg-white p-4 rounded-xl border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
                          onClick={() => {
                            setSelectedHistoricalVisit(visit);
                            setIsHistoryDetailsOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-800">
                                {new Date(visit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Doctor: {visit.consultingDoctorName || visit.consultation?.doctorName || "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-5 rounded-none bg-orange-50 text-orange-600 border-orange-200 text-[8px] font-black uppercase hover:bg-orange-50 hover:text-orange-600">
                              {visit.status}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 no-print">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Scanned Reports
                  </h3>
                  <ScanReportGallery
                    mrNumber={selectedFamilyPatient.mrNumber?.toString()}
                    variant="compact"
                    showButton={false}
                    allowUpload={false}
                    wrapInCard={true}
                    forceShow={true}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Consolidated / Separate Print Section */}
      {printType && printData && createPortal(
        <div id="print-section" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 m-0 overflow-visible print-section">
          <SharedPrintLayout printData={printData} printType={printType} />
        </div>,
        document.body
      )}
    </div>
  );
}

export default DoctorStation;
