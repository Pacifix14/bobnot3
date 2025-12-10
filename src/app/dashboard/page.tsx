import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { type Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Fetch workspaces
  const workspace = await db.workspace.findFirst({
    where: { ownerId: session.user.id },
  });

  if (workspace) {
    redirect(`/dashboard/${workspace.id}`);
  }

  // Create default workspace
  const newWorkspace = await db.workspace.create({
    data: {
      name: "My Workspace",
      ownerId: session.user.id,
      folders: {
        create: {
          name: "General",
        }
      }
    },
  });

  redirect(`/dashboard/${newWorkspace.id}`);
}
