import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { Editor } from "@/components/editor";

export const dynamic = 'force-dynamic';

export default async function PageEditor({
  params,
}: {
  params: Promise<{ workspaceId: string; pageId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { pageId } = await params;

  const page = await db.page.findUnique({
    where: { id: pageId },
    include: { workspace: true, collaborators: true }
  });

  if (!page) redirect("/dashboard");

  const isOwner = page.workspace.ownerId === session.user.id;
  const isCollaborator = page.collaborators.some(c => c.id === session.user.id);
  
  if (!isOwner && !isCollaborator) {
      redirect("/dashboard");
  }

  return (
    <div className="py-12 px-8 min-h-full">
      <Editor pageId={page.id} title={page.title} />
    </div>
  );
}
