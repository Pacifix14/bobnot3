"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { User, Mail } from "lucide-react";

export default function AccountSettings() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-3xl"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-4">Profile</h2>
        <div className="grid gap-6 rounded-xl border bg-card p-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid gap-2">
                <Label>Display Name</Label>
                <Input defaultValue="User" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" defaultValue="user@example.com" disabled />
                </div>
              </div>
              <Button>Save Changes</Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-4 text-destructive">Danger Zone</h2>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium text-destructive">Delete Account</Label>
              <p className="text-sm text-destructive/80">
                Permanently delete your account and all of your content.
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


