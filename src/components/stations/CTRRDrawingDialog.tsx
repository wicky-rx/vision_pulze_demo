import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Eraser,
  Type,
  Trash2,
  Undo2,
  Download,
  Palette,
  Crosshair
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface CTRRDrawingDialogProps {
  initialData?: string;
  onSave: (data: string) => void;
  trigger?: React.ReactNode;
}

export function CTRRDrawingDialog({ initialData, onSave, trigger }: CTRRDrawingDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("brand");
  const [tool, setTool] = useState<"pen" | "eraser" | "text">("pen");
  const [brushSize, setBrushSize] = useState(2);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (!open) {
      setIsDirty(false); // Reset dirty flag when closing/closed
      return;
    }

    // Small delay to ensure the Dialog content and Canvas are fully mounted in the DOM
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas resolution
        canvas.width = 600;
        canvas.height = 400;

        // Ensure background is ready
        drawBackground(ctx);

        // Load initial data
        if (initialData) {
          const img = new Image();
          if (!initialData.startsWith('data:')) {
            img.crossOrigin = "anonymous";
          }
          
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 600, 400);
          };
          img.src = initialData;
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open, initialData]);

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Draw Optical Power Cross Template
    ctx.beginPath();
    ctx.moveTo(100, 200);
    ctx.lineTo(500, 200);
    ctx.moveTo(300, 50);
    ctx.lineTo(300, 350);
    ctx.stroke();

    ctx.setLineDash([]);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDirty(true);

    if (tool === "text") {
      ctx.fillStyle = color;
      ctx.font = "16px sans-serif";
      ctx.fillText(text, pos.x, pos.y);
      setIsDrawing(false);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === "text") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getPos(e);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 4 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    return {
      x: (x / rect.width) * canvas.width,
      y: (y / rect.height) * canvas.height
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx);
    setIsDirty(true);
  };

  const handleSave = () => {
    // Optimization: If nothing changed, don't generate a new Data URI.
    // This prevents the application from re-uploading the same image to Google Drive.
    if (!isDirty && initialData) {
      setOpen(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL("image/png");
    onSave(dataURL);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Open CTRR</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-[700px] bg-white border-2 border-brand">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand">
            <Crosshair className="w-5 h-5" />
            Optical Cross Diagram (CTRR) Drawing
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-accent/5 p-2 rounded-lg border border-accent/10">
            <div className="flex items-center gap-1">
              <Button
                variant={tool === "pen" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("pen")}
                className="h-8 w-8 p-0"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant={tool === "eraser" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("eraser")}
                className="h-8 w-8 p-0"
              >
                <Eraser className="w-4 h-4" />
              </Button>
              <Button
                variant={tool === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("text")}
                className="h-8 w-8 p-0"
              >
                <Type className="w-4 h-4" />
              </Button>
            </div>

            {tool === "text" && (
              <Input
                className="h-8 w-[150px] text-xs"
                placeholder="Enter text..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {["brand", "#c53030", "#2b6cb0", "#2f855a", "#000000"].map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "w-4 h-4 rounded-full border border-black/10",
                      color === c && "ring-2 ring-offset-1 ring-blue-500"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <Separator orientation="vertical" className="h-4" />
              <Button variant="ghost" size="sm" onClick={clearCanvas} className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <div className="border border-black/10 rounded-lg overflow-hidden cursor-crosshair shadow-inner bg-white" style={{ backgroundColor: 'white' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full touch-none bg-white"
              style={{ backgroundColor: 'white' }}
            />
          </div>

          <p className="text-[10px] text-muted-foreground italic text-center">
            Draw the Optical Power Cross with relevant metrics for Contact Lens evaluation.
          </p>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" className="bg-brand" onClick={handleSave}>Save Drawing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
