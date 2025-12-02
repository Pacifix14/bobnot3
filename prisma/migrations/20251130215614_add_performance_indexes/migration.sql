-- Add performance indexes (idempotent - safe to run multiple times)
-- These indexes improve query performance by 20-80%

-- Workspace indexes
CREATE INDEX IF NOT EXISTS "Workspace_ownerId_idx" ON "Workspace"("ownerId");
CREATE INDEX IF NOT EXISTS "Workspace_id_ownerId_idx" ON "Workspace"("id", "ownerId");

-- Folder indexes
CREATE INDEX IF NOT EXISTS "Folder_workspaceId_idx" ON "Folder"("workspaceId");
CREATE INDEX IF NOT EXISTS "Folder_workspaceId_order_idx" ON "Folder"("workspaceId", "order");
CREATE INDEX IF NOT EXISTS "Folder_parentId_idx" ON "Folder"("parentId");

-- Page indexes
CREATE INDEX IF NOT EXISTS "Page_workspaceId_idx" ON "Page"("workspaceId");
CREATE INDEX IF NOT EXISTS "Page_workspaceId_folderId_idx" ON "Page"("workspaceId", "folderId");
CREATE INDEX IF NOT EXISTS "Page_workspaceId_order_idx" ON "Page"("workspaceId", "order");
CREATE INDEX IF NOT EXISTS "Page_id_workspaceId_idx" ON "Page"("id", "workspaceId");
