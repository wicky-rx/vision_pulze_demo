import { useState, useEffect, useCallback } from "react";
import { FileText, Download, ExternalLink, Loader2, Image as ImageIcon, X, Upload, Trash2, Check, Plus, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config";
import { truncateFileName, formatFileSize } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  title: string;      // maps to backend fileName
  category: string;   // maps to backend scanType
  fileId?: string; 
  filePath?: string;
  webViewLink?: string;
  webContentLink?: string;
  uploadedAt: string;
}

const SCROLL_AMOUNT = 320; // Approximately two card widths

export function ScanReportGallery({ 
  mrNumber, 
  visitId, 
  allowUpload = false,
  variant = "gallery",
  showStatus = true,
  showButton = true,
}: { 
  mrNumber?: string, 
  visitId?: string, 
  allowUpload?: boolean,
  variant?: "gallery" | "compact",
  showStatus?: boolean,
  showButton?: boolean,
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const { toast } = useToast();

  // Upload states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [scanTypes, setScanTypes] = useState<any[]>([]);
  const [selectedScanType, setSelectedScanType] = useState<string>("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Delete states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!mrNumber) return;
    fetchDocuments();

    // Sync across multiple instances (e.g., status box vs footer button)
    const handleSync = () => fetchDocuments();
    window.addEventListener('patientDocumentsUpdated', handleSync);
    return () => window.removeEventListener('patientDocumentsUpdated', handleSync);
  }, [mrNumber, visitId]);

  const fetchDocuments = async () => {
    if (!mrNumber) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = visitId 
        ? `${API_BASE_URL}/api/documents/visit/${visitId}`
        : `${API_BASE_URL}/api/documents/patient/${mrNumber}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error("Error fetching documents", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchScanTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/admin/scan-types`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setScanTypes(data);
      }
    } catch (e) { console.error("Error fetching scan types", e); }
  };

  useEffect(() => {
    if (isUploadOpen && scanTypes.length === 0) {
      fetchScanTypes();
    }
  }, [isUploadOpen]);

  const handleUploadFiles = async () => {
    if (!mrNumber || !selectedScanType || uploadFiles.length === 0) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("mrNumber", mrNumber);
      if (visitId) formData.append("visitId", visitId);
      formData.append("scanType", selectedScanType);
      
      uploadFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      toast({
        title: "Success",
        description: "Files uploaded successfully.",
      });
      // Notify other instances
      window.dispatchEvent(new CustomEvent('patientDocumentsUpdated'));
      setIsUploadOpen(false);
      setUploadFiles([]);
      setSelectedScanType("");
      fetchDocuments();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to upload files.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOptimizeImage = async (idx: number) => {
    const file = uploadFiles[idx];
    if (!file || !file.type.startsWith('image/')) return;
    
    toast({
      title: "Optimizing...",
      description: `Reducing size for ${file.name}`,
    });

    try {
      const optimizedFile = await new Promise<File>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error("Canvas context failed")); return; }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                const newName = file.name.substring(0, file.name.lastIndexOf('.')) + ".png";
                resolve(new File([blob], newName, { type: 'image/png' }));
              } else {
                reject(new Error("Blob conversion failed"));
              }
            }, 'image/png');
          };
          img.onerror = () => reject(new Error("Image loading failed"));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsDataURL(file);
      });

      setUploadFiles(prev => {
        const newList = [...prev];
        if (optimizedFile.size < file.size) {
          newList[idx] = optimizedFile;
          toast({
            title: "Success",
            description: `Saved ${formatFileSize(file.size - optimizedFile.size)}.`,
          });
        } else {
          toast({
            title: "Optimized",
            description: "No further reduction possible.",
          });
        }
        return newList;
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Optimization Failed",
        description: e.message,
      });
    }
  };

  const handleDeleteDocument = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Deletion failed");

      toast({
        title: "Deleted",
        description: "Document removed successfully.",
      });
      setSelectedDoc(null);
      fetchDocuments();
      // Notify other instances
      window.dispatchEvent(new CustomEvent('patientDocumentsUpdated'));
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to delete document.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
      </div>
    );
  }

  if (documents.length === 0 && !allowUpload) return null;

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {showStatus && (
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 flex flex-col gap-1 min-h-[140px]">
              <div className="flex items-center justify-between border-b border-orange-200 pb-1.5 mb-1.5 ">
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Scans Uploaded: {documents.length}</span>
                  <Check className="w-3 h-3 text-orange-400" />
              </div>
              
              {documents.length === 0 ? (
                  <p className="text-[10px] text-orange-400 italic py-6 text-center">No reports uploaded yet.</p>
              ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-[110px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent pr-1.5">
                     {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between group py-0.5 border-b border-orange-100/50 last:border-0">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:text-orange-700 transition-colors flex-1 min-w-0"
                            onClick={() => setSelectedDoc(doc)}
                          >
                              <span className="font-semibold text-orange-800 uppercase text-[9px] truncate">{doc.category}</span>
                              <Check className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                          </div>
                          
                          <button 
                            onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteDocument(doc.id, e);
                            }}
                            className="p-1 rounded-md hover:bg-red-50 text-orange-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Scan"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                      </div>
                     ))}
                  </div>
              )}
          </div>
        )}

        {allowUpload && showButton && (
            <Button 
                size="sm" 
                variant="outline" 
                className="gap-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 shadow-sm w-full md:w-auto transition-all font-bold"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsUploadOpen(true);
                }}
            >
                <Upload className="w-4 h-4" />
                Upload Documents
            </Button>
        )}
        {renderModals()}
      </div>
    );
  }

  return (
    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
      <div className="pb-3 border-b border-orange-100 flex flex-row items-center justify-between space-y-0 mb-4">
        <p className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-slate-900">
          <FileText className="w-4 h-4 text-slate-900/70" />
          Patient Scan Reports
        </p>
        {allowUpload && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload New
          </Button>
        )}
      </div>
      <div className="relative group/gallery">
        {documents.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs italic">No scan reports found for this visit.</p>
           </div>
        ) : (
          <div className="relative overflow-hidden">
            {documents.length > 6 && (
                <>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-8 bg-white/40 hover:bg-white/80 backdrop-blur-sm border border-border/50 rounded-r-xl rounded-l-none opacity-0 group-hover/gallery:opacity-100 transition-opacity hidden md:flex"
                    onClick={() => {
                        const el = document.getElementById(`gallery-${mrNumber || visitId}`);
                        if (el) el.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
                    }}
                >
                    <ChevronLeft className="w-4 h-4 text-orange-600" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-8 bg-white/40 hover:bg-white/80 backdrop-blur-sm border border-border/50 rounded-l-xl rounded-r-none opacity-0 group-hover/gallery:opacity-100 transition-opacity hidden md:flex"
                    onClick={() => {
                        const el = document.getElementById(`gallery-${mrNumber || visitId}`);
                        if (el) el.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
                    }}
                >
                    <ChevronRight className="w-4 h-4 text-orange-600" />
                </Button>
                </>
            )}

            <div 
              id={`gallery-${mrNumber || visitId}`}
              className={cn(
                "flex items-center gap-4 transition-all scrollbar-hide w-full",
                documents.length > 6 ? "overflow-x-auto snap-x snap-mandatory pb-4" : "flex-wrap"
              )}
              style={{ scrollBehavior: 'smooth' }}
            >
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className={cn(
                    "group/item relative flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-border hover:border-accent/40 hover:shadow-md transition-all cursor-pointer snap-start",
                    documents.length > 6 ? "min-w-[160px] max-w-[180px]" : "w-[calc(16.666%-1rem)] min-w-[140px]"
                  )}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center pointer-events-none">
                    <ImageIcon className="w-6 h-6 text-slate-900/50" />
                  </div>
                  <div className="text-center overflow-hidden w-full px-1 pointer-events-none">
                    <p className="text-[10px] font-bold text-slate-900 uppercase truncate" title={doc.category}>{doc.category}</p>
                    <p className="text-[10px] text-foreground font-medium truncate" title={doc.title}>{truncateFileName(doc.title, 24)}</p>
                    <p className="text-[8px] text-muted-foreground/90 font-bold">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  
                  <Badge variant="outline" className="text-[8px] px-1 py-0 bg-orange-50 border-orange-200 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none">
                    View Details
                  </Badge>
                  
                  {allowUpload && (
                    <button
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id, e);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-red-500 shadow-sm opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 border border-red-100 z-20"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {renderModals()}
    </div>
  );

  function renderModals() {
    return (
      <>
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-md border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground pt-2">
              Are you sure you want to permanently delete this scan report? 
              <br />
              This action <span className="font-bold text-red-500">cannot be undone</span> and will remove the file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="border-border/50 hover:bg-muted font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-none font-bold shadow-lg shadow-red-500/20"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : "Yes, Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-900">
                <FileText className="w-4 h-4 text-slate-900/70" />
                {selectedDoc?.category} Report — {selectedDoc && truncateFileName(selectedDoc.title)}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 mt-4 overflow-hidden h-[75vh]">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Scan Report</span>
                    <span className="text-sm font-semibold truncate">{selectedDoc?.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">File Name</span>
                    <span className="text-sm font-medium truncate" title={selectedDoc?.title}>{selectedDoc?.title ? truncateFileName(selectedDoc.title) : ''}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Upload Date</span>
                    <span className="text-sm font-medium">{selectedDoc && new Date(selectedDoc.uploadedAt).toLocaleString()}</span>
                </div>
             </div>

             <div className="flex flex-wrap gap-2">
                {selectedDoc?.webViewLink && (
                    <Button 
                        onClick={() => window.open(selectedDoc.webViewLink, '_blank')}
                        className="gap-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 shadow-sm grow md:grow-0 transition-all font-bold"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open on Google Drive
                    </Button>
                )}
                {selectedDoc?.webContentLink && (
                    <Button 
                        variant="outline"
                        onClick={() => window.open(selectedDoc.webContentLink, '_blank')}
                        className="gap-2 bg-white hover:bg-orange-50 text-slate-700 border border-slate-200 hover:border-orange-200 hover:text-orange-600 shadow-sm grow md:grow-0 transition-all font-bold"
                    >
                        <Download className="w-4 h-4" />
                        Download File
                    </Button>
                )}
                {selectedDoc?.filePath && (
                    <Button 
                        onClick={() => window.open(`${API_BASE_URL}/${selectedDoc.filePath}`, '_blank')}
                        className="gap-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 shadow-sm grow md:grow-0 transition-all font-bold"
                    >
                        <FileText className="w-4 h-4" />
                        View Server File
                    </Button>
                )}
                {allowUpload && selectedDoc && (
                   <Button 
                     variant="destructive"
                     onClick={() => handleDeleteDocument(selectedDoc.id)}
                     className="gap-2 grow md:grow-0"
                   >
                     <Trash2 className="w-4 h-4" />
                     Delete Permanently
                   </Button>
                )}
             </div>

             <div className="flex-1 bg-white rounded-2xl relative overflow-hidden border border-border shadow-inner">
                {selectedDoc ? (
                  <iframe 
                    src={`${API_BASE_URL}/api/documents/${selectedDoc.id}/preview`} 
                    className="w-full h-full border-0"
                    loading="lazy"
                    title="Scan Document Preview"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 p-10 text-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground opacity-20" />
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-foreground">Loading preview...</p>
                      </div>
                  </div>
                )}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Upload className="w-4 h-4" />
              Upload Scan Reports
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Select Scan Type</Label>
              <Select value={selectedScanType} onValueChange={setSelectedScanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] scrollbar-thin overflow-y-auto">
                  {scanTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Select Files</Label>
              <div 
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                  "hover:border-accent/40 hover:bg-accent/5 cursor-pointer",
                  uploadFiles.length > 0 ? "border-orange-200 bg-orange-50" : "border-muted"
                )}
                onClick={() => document.getElementById('file-upload-gallery')?.click()}
              >
                <input 
                  id="file-upload-gallery" 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadFiles(Array.from(e.target.files));
                    }
                  }}
                />
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">Click to select files</p>
                <p className="text-xs text-muted-foreground mt-1">Single or multiple files allowed</p>
              </div>
            </div>

            {uploadFiles.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Files to upload ({uploadFiles.length})</Label>
                {uploadFiles.map((file, idx) => (
                  <div key={idx} className="space-y-1.5 p-2 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-xs">
                      <FileText className={cn("w-3.5 h-3.5", file.size > 15 * 1024 * 1024 ? "text-amber-500" : "text-orange-600")} />
                      <span className="flex-1 truncate font-medium min-w-0" title={file.name}>
                        {truncateFileName(file.name)}
                      </span>
                      <span className={cn("text-[10px] shrink-0", file.size > 15 * 1024 * 1024 ? "text-amber-600 font-bold" : "text-muted-foreground")}>
                        {formatFileSize(file.size)}
                      </span>
                      <button 
                        onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-red-500"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    {file.type.startsWith('image/') && file.size > 1.5 * 1024 * 1024 && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[9px] gap-1.5 text-orange-600 hover:text-orange-600 hover:bg-accent/10 py-0"
                          onClick={() => handleOptimizeImage(idx)}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          Optimize Lossless
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadFiles} 
              disabled={isUploading || !selectedScanType || uploadFiles.length === 0}
              className="bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 gap-2 transition-all font-bold"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Upload Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  }
}
