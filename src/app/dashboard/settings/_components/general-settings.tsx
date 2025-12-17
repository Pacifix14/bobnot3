"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

export default function GeneralSettings() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-3xl"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Workspace</h2>
        <div className="grid gap-6 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Workspace Name</Label>
              <p className="text-sm text-muted-foreground">
                The name of your workspace visible to your team.
              </p>
            </div>
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input defaultValue="My Workspace" />
            <Button variant="secondary">Save</Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Preferences</h2>
        <div className="grid gap-6 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Language</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred language for the interface.
              </p>
            </div>
            <select className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option>English (US)</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Timezone</Label>
              <p className="text-sm text-muted-foreground">
                Set your local timezone for accurate timestamps.
              </p>
            </div>
            <select className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option>UTC-08:00 (PST)</option>
              <option>UTC-05:00 (EST)</option>
              <option>UTC+00:00 (GMT)</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


