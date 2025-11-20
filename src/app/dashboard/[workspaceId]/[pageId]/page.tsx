import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { Editor } from "@/components/editor";

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
  });

  if (!page) redirect("/dashboard");

  return (
    <div className="py-12 px-8 h-full">
      <Editor pageId={page.id} title={page.title} />
    </div>
  );
}
