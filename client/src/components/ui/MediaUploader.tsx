import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, FileVideo, Loader2, X, FolderOpen } from 'lucide-react';
import { uploadFile } from '../../services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { MediaLibraryDialog } from '../media/MediaLibraryDialog';

interface MediaUploaderProps {
  value?: string | string[];
  onChange: (url: any) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (urls: string | string[], files: File | File[]) => void;
  onUploadError?: (error: Error) => void;
  accept?: string;
  className?: string;
  label?: string;
  multiple?: boolean;
}

export function MediaUploader({
  value,
  onChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  accept = 'image/*,video/*',
  className,
  label = 'Drag & drop media here or click to browse',
  multiple = false,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHoveredOrFocusedRef = useRef(false);
  // The window `paste` listener is registered once on mount, so it must call the
  // *latest* upload handler — otherwise it captures the first render's closure
  // (stale `value`/`onChange`), which on paste overwrites the parent's state
  // with its initial values and wipes other form fields.
  const handleFilesUploadRef = useRef<(files: File[]) => void>(() => {});

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Only process paste if this specific uploader is being hovered or focused
      const isFocused = document.activeElement === containerRef.current;
      if (!isHoveredOrFocusedRef.current && !isFocused) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') === 0 || item.type.indexOf('video') === 0) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFilesUploadRef.current(multiple ? files : [files[0]]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(multiple ? Array.from(e.dataTransfer.files) : [e.dataTransfer.files[0]]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesUpload(multiple ? Array.from(e.target.files) : [e.target.files[0]]);
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      setIsUploading(true);
      onUploadStart?.();

      // Use allSettled so a single failed upload doesn't discard the others.
      const results = await Promise.allSettled(files.map(file => uploadFile(file)));

      const uploadedUrls: string[] = [];
      const uploadedFiles: File[] = [];
      const failures: { file: File; reason: any }[] = [];

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          uploadedUrls.push(result.value);
          uploadedFiles.push(files[idx]);
        } else {
          failures.push({ file: files[idx], reason: result.reason });
        }
      });

      // Report failures per-file.
      failures.forEach(({ file, reason }) => {
        console.error('Upload failed:', file.name, reason);
        toast.error(`Failed to upload ${file.name}`);
        onUploadError?.(reason instanceof Error ? reason : new Error(String(reason)));
      });

      // Keep any successful uploads.
      if (uploadedUrls.length > 0) {
        if (multiple) {
          const currentUrls = Array.isArray(value) ? value : (value ? [value] : []);
          onChange([...currentUrls, ...uploadedUrls]);
          onUploadComplete?.(uploadedUrls, uploadedFiles);
        } else {
          onChange(uploadedUrls[0]);
          onUploadComplete?.(uploadedUrls[0], uploadedFiles[0]);
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };
  // Refresh the ref each render so the (once-registered) paste listener always
  // invokes the current closure.
  handleFilesUploadRef.current = handleFilesUpload;

  const handleClear = (e: React.MouseEvent, indexToRemove?: number) => {
    e.stopPropagation();
    if (multiple && Array.isArray(value)) {
      if (indexToRemove !== undefined) {
        onChange(value.filter((_, i) => i !== indexToRemove));
      } else {
        onChange([]);
      }
    } else {
      onChange('');
    }
  };

  const isVideo = (url: string) => url.match(/\.(mp4|webm|ogg)$/i);
  const hasValue = multiple ? (Array.isArray(value) && value.length > 0) : !!value;
  const values = multiple ? (Array.isArray(value) ? value : (value ? [value] : [])) : (value ? [value as string] : []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative group flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors cursor-pointer overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 bg-muted/30 hover:bg-muted/50',
        className
      )}
      onMouseEnter={() => { isHoveredOrFocusedRef.current = true; }}
      onMouseLeave={() => { isHoveredOrFocusedRef.current = false; }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileSelect}
        disabled={isUploading}
        multiple={multiple}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Uploading...</span>
        </div>
      ) : hasValue ? (
        <div className="absolute inset-0 w-full h-full bg-black/5 flex items-center justify-start p-2 gap-2 overflow-x-auto">
          {values.map((val, idx) => (
            <div key={idx} className="relative h-full aspect-square shrink-0">
              {isVideo(val) ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground bg-card/90 rounded-md shadow-sm border">
                  <FileVideo className="w-8 h-8 text-primary" />
                </div>
              ) : (
                <img src={val} alt="Uploaded media" className="w-full h-full object-cover rounded-md" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleClear(e, idx)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <div className="flex items-center gap-2 mb-0.5">
            <ImageIcon className="w-5 h-5 opacity-70" />
            <span className="text-xs font-bold text-muted-foreground/50">/</span>
            <FileVideo className="w-5 h-5 opacity-70" />
          </div>
          <span className="text-xs font-medium text-center px-4 font-semibold">
            {label}
            <br />
            <span className="text-[10px] font-normal opacity-70">or paste from clipboard</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[11px] gap-1 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsLibraryOpen(true);
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Browse Library
          </Button>
        </div>
      )}

      <MediaLibraryDialog
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
        onSelect={(selected) => {
          if (multiple) {
            const currentUrls = Array.isArray(value) ? value : (value ? [value] : []);
            const newUrls = Array.isArray(selected) ? selected : [selected];
            onChange([...currentUrls, ...newUrls]);
            onUploadComplete?.(newUrls, []);
          } else {
            const val = Array.isArray(selected) ? selected[0] : selected;
            onChange(val);
            onUploadComplete?.(val, []);
          }
        }}
        multiple={multiple}
        accept={accept}
      />
    </div>
  );
}
