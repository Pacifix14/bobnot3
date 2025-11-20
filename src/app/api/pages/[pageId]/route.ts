import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ pageId: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { pageId } = await params;
    const json = await req.json();

    const page = await db.page.findUnique({
        where: { id: pageId },
        include: { workspace: true }
    });

    if (!page || page.workspace.ownerId !== session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const updatedPage = await db.page.update({
        where: { id: pageId },
        data: {
            content: json.content ?? undefined,
            title: json.title ?? undefined,
        },
    });

    return NextResponse.json(updatedPage);
}
