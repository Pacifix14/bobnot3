"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

interface BannerImageProps {
  url?: string | null;
  editable: boolean;
  onUpdate: (url: string | null) => void;
  className?: string;
}

export function BannerImage({ url, editable, onUpdate, className }: BannerImageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
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

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image");

      const finalUrl = `/api/images/${encodeURIComponent(fileKey)}`;

      onUpdate(finalUrl);
      showToast("Banner image updated", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to upload image", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
  };

  const removeBanner = () => {
    onUpdate(null);
  };

  return (
    <div
      className={cn(
        "group relative w-full h-full overflow-hidden transition-all",
        !url && "bg-muted/30 flex items-center justify-center border-b-2 border-dashed border-muted-foreground/20 hover:border-primary/50 cursor-pointer",
        url && "bg-background",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !url && editable && fileInputRef.current?.click()}
    >
      {url ? (
        <>
          <Image
            src={url}
            alt="Banner"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          {/* Gradient fade to background */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-background/5 to-background pointer-events-none" />
          {editable && isHovered && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Change Banner
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBanner();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 opacity-50" />
              <span className="text-sm font-medium">Add Banner</span>
            </>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={onFileChange}
        disabled={!editable || isUploading}
      />
    </div>
  );
}
