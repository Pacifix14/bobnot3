"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

interface CoverImageProps {
  url?: string | null;
  editable: boolean;
  onUpdate: (url: string | null) => void;
  className?: string;
  onClick?: () => void; // Optional click handler for non-editable instances
}

export function CoverImage({ url, editable, onUpdate, className, onClick }: CoverImageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Get presigned URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!res.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, fileKey } = (await res.json()) as { uploadUrl: string; fileKey: string };

      // 2. Upload to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image");

      // 3. Construct public URL (This is the tricky part without a known public domain)
      // For now, we will assume we can use a presigned GET url or the user has a public domain.
      // BUT, since we didn't implement a "get read url" API, and we want permanent links...
      // Let's assume the user has a public bucket or worker.
      // If we use the R2 dev URL, we need the subdomain.
      // WORKAROUND: We will use a proxy route or just store the Key and have a component that fetches a signed URL?
      // No, that's too complex for "just an image".
      // Let's try to use the R2 public URL format if we can, or ask the user.
      // For now, I will assume a standard public access pattern or that we can just use the upload URL (which is wrong, it expires).
      
      // Let's assume we have a public domain variable, or we default to a placeholder until configured.
      // Actually, for this task, I'll implement a "view" route that redirects to a signed URL if we want to be secure/easy.
      // OR, simpler: We just assume the bucket is public and the URL is https://<bucket>.<account>.r2.cloudflarestorage.com/<key> (This is NOT public usually).
      
      // Let's use a "view" API route for now to be safe and zero-config.
      // /api/images/[key] -> redirects to signed URL.
      const finalUrl = `/api/images/${encodeURIComponent(fileKey)}`;
      
      onUpdate(finalUrl);
      showToast("Cover image updated", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to upload image", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editable && !isUploading) {
      void handleUpload(file);
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeCover = () => {
    onUpdate(null);
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleContainerClick();
  };

  const handleContainerClick = () => {
    // If there's a custom onClick handler (e.g., to open dialog), use it
    if (onClick) {
      onClick();
      return;
    }
    
    // Otherwise, handle file upload if editable
    if (!isUploading && fileInputRef.current && editable) {
      fileInputRef.current.click();
    }
  };

  const hasNoImage = !url || url === "";

  return (
    <div 
      className={cn(
        "group relative w-full aspect-square rounded-lg shadow-2xl overflow-hidden transition-all border-2 border-dashed",
        hasNoImage && "bg-muted border-muted-foreground/20",
        hasNoImage && editable && !isUploading && "hover:border-primary/50",
        url && "border-transparent bg-background",
        (onClick ?? editable) && "cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleContainerClick}
    >
      {url ? (
        <>
          <Image 
            src={url} 
            alt="Cover" 
            fill 
            className="object-cover"
            priority
            unoptimized
          />
          {editable && isHovered && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity pointer-events-none">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="pointer-events-auto"
              >
                Change
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeCover();
                }}
                className="pointer-events-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={handleButtonClick}
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          className="w-full h-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <ImageIcon className="w-8 h-8 opacity-50" />
                <span className="text-sm font-medium">Add Cover</span>
              </>
            )}
          </div>
        </button>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={onFileChange}
      />
    </div>
  );
}
