"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, Upload, Image as ImageIcon, LayoutDashboard, Monitor } from "lucide-react";
import { motion } from "framer-motion";

export default function AppearanceForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();
  const { data: settings, isLoading } = api.settings.getSettings.useQuery();

  const updateSidebar = api.settings.updateSidebarVersion.useMutation({
    onSuccess: async () => {
      await utils.settings.getSettings.invalidate();
      router.refresh();
    },
  });

  const updateBackground = api.settings.updateBackgroundImage.useMutation({
    onSuccess: async () => {
      await utils.settings.getSettings.invalidate();
      router.refresh();
    },
  });

  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSidebarToggle = (version: "v1" | "v2") => {
    updateSidebar.mutate({ version });
  };

  const handleRemoveBackground = () => {
    updateBackground.mutate({ backgroundImage: null });
    setShowUrlInput(false);
    setBackgroundUrl("");
  };

  const handleSetBackground = () => {
    if (backgroundUrl.trim()) {
      updateBackground.mutate({ backgroundImage: backgroundUrl.trim() });
      setShowUrlInput(false);
      setBackgroundUrl("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      updateBackground.mutate({ backgroundImage: data.url });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Sidebar Interface</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the navigation style that suits your workflow best.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* V1 Option */}
          <div
            onClick={() => handleSidebarToggle("v1")}
            className={`
              cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50
              ${settings?.sidebarVersion === "v1" ? "border-primary bg-primary/5" : "border-border bg-card"}
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-background border shadow-sm">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <span className="font-medium">Classic Sidebar</span>
              </div>
              {settings?.sidebarVersion === "v1" && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="w-1/4 h-20 rounded bg-muted/50 border border-dashed border-muted-foreground/20"></div>
                <div className="w-3/4 h-20 rounded bg-muted/20 border border-dashed border-muted-foreground/20"></div>
              </div>
            </div>
          </div>

          {/* V2 Option */}
          <div
            onClick={() => handleSidebarToggle("v2")}
            className={`
              cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50
              ${settings?.sidebarVersion === "v2" ? "border-primary bg-primary/5" : "border-border bg-card"}
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-background border shadow-sm">
                  <LayoutDashboard className="h-4 w-4 rotate-90" />
                </div>
                <span className="font-medium">Modern Floating</span>
              </div>
              {settings?.sidebarVersion === "v2" && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="relative h-20 rounded bg-muted/20 border border-dashed border-muted-foreground/20 overflow-hidden">
              <div className="absolute left-2 top-2 bottom-2 w-8 rounded-full bg-muted/50 border border-dashed border-muted-foreground/20"></div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="h-px bg-border/50" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Background</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize your workspace with a custom background image.
          </p>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col gap-6">
              {settings?.backgroundImage ? (
                <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border shadow-sm group">
                  <img
                    src={settings.backgroundImage}
                    alt="Background"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveBackground}
                      className="h-8"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full max-w-md rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/5 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-50" />
                  <span className="text-sm">No background image set</span>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0 z-10"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    disabled={uploading}
                  />
                  <Button variant="outline" disabled={uploading}>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Image
                  </Button>
                </div>
                
                <div className="relative flex-1 max-w-sm">
                  {showUrlInput ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={backgroundUrl}
                        onChange={(e) => setBackgroundUrl(e.target.value)}
                        className="h-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSetBackground();
                          if (e.key === 'Escape') setShowUrlInput(false);
                        }}
                        autoFocus
                      />
                      <Button size="icon" onClick={handleSetBackground}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowUrlInput(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setShowUrlInput(true)}
                    >
                      Enter URL
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-muted/30 px-6 py-4 border-t">
            <p className="text-xs text-muted-foreground">
              Recommended size: 1920x1080px. Maximum file size: 5MB.
              Supported formats: JPG, PNG, WebP.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


