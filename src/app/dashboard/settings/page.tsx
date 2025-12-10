"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, ArrowLeft, Upload, Image } from "lucide-react";

export default function SettingsPage() {
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

  useEffect(() => {
    document.title = "Settings | bobnot3";
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploading(true);

    try {
      // Get signed upload URL
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!response.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, fileKey } = (await response.json()) as {
        uploadUrl: string;
        fileKey: string;
      };

      // Upload file to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload file");

      // Construct the image URL using our API proxy
      const imageUrl = `/api/images/${encodeURIComponent(fileKey)}`;

      // Update user settings
      updateBackground.mutate({ backgroundImage: imageUrl });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Customize your workspace experience
            </p>
          </div>
        </div>

        {/* Sidebar Version */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Sidebar Version</h2>
            <p className="text-sm text-muted-foreground">
              Choose between the original sidebar or the new animated version
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleSidebarToggle("v1")}
              disabled={updateSidebar.isPending}
              className={`flex-1 rounded-lg border-2 p-6 text-left transition-all ${
                settings?.sidebarVersion === "v1"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">Sidebar V1</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Classic collapsible sidebar
                  </p>
                </div>
                {settings?.sidebarVersion === "v1" && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>

            <button
              onClick={() => handleSidebarToggle("v2")}
              disabled={updateSidebar.isPending}
              className={`flex-1 rounded-lg border-2 p-6 text-left transition-all ${
                settings?.sidebarVersion === "v2"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">Sidebar V2</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Floating sidebar with animations
                  </p>
                </div>
                {settings?.sidebarVersion === "v2" && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Background Image */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Background Image</h2>
            <p className="text-sm text-muted-foreground">
              Set a custom background image for your workspace
            </p>
          </div>

          <div className="space-y-3">
            {settings?.backgroundImage && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded border bg-muted overflow-hidden">
                    <img
                      src={settings.backgroundImage}
                      alt="Background preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Current Background</p>
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {settings.backgroundImage}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleRemoveBackground}
                  variant="outline"
                  size="sm"
                  disabled={updateBackground.isPending}
                >
                  {updateBackground.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Remove
                </Button>
              </div>
            )}

            {!settings?.backgroundImage && (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No background image set
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={uploading || updateBackground.isPending}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>

              {showUrlInput ? (
                <>
                  <Input
                    value={backgroundUrl}
                    onChange={(e) => setBackgroundUrl(e.target.value)}
                    placeholder="Or enter image URL..."
                    type="url"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSetBackground}
                    disabled={!backgroundUrl.trim() || updateBackground.isPending}
                  >
                    {updateBackground.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Set"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowUrlInput(false);
                      setBackgroundUrl("");
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShowUrlInput(true)} variant="outline">
                  <Image className="h-4 w-4 mr-2" />
                  Use URL Instead
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
