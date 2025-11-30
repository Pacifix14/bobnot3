import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const COLORS = [
    "#6366f1", // Soft Indigo
    "#8b5cf6", // Soft Purple  
    "#06b6d4", // Soft Cyan
    "#10b981", // Soft Emerald
    "#f59e0b", // Soft Amber
    "#ef4444", // Soft Red
    "#ec4899", // Soft Pink
    "#84cc16", // Soft Lime
    "#6b7280", // Soft Gray
    "#14b8a6", // Soft Teal
    "#f97316", // Soft Orange
    "#3b82f6", // Soft Blue
];

function getUserColor(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Get the room from the request body
    const { room } = await request.json() as { room: string };

    if (!room) {
        return new Response("Missing room", { status: 400 });
    }

    // Check access
    let hasAccess = false;

    // Assume room format "page-{id}"
    if (typeof room === 'string' && room.startsWith("page-")) {
        const pageId = room.replace("page-", "");
        // Optimize query - only fetch what we need for access check
        const page = await db.page.findUnique({
            where: { id: pageId },
            select: {
                workspace: {
                    select: {
                        ownerId: true,
                    }
                },
                collaborators: {
                    select: {
                        id: true,
                    }
                }
            }
        });

        if (page) {
            if (page.workspace.ownerId === session.user.id) {
                hasAccess = true;
            } else if (page.collaborators.some(c => c.id === session.user.id)) {
                hasAccess = true;
            }
        }
    }

    if (!hasAccess) {
        return new Response("Forbidden", { status: 403 });
    }

    // Get the current user's info
    const user = {
        id: session.user.id,
        info: {
            name: session.user.name ?? "Anonymous",
            email: session.user.email ?? "",
            avatar: session.user.image ?? "",
            color: getUserColor(session.user.id),
        },
    };

    // Create a session for the current user
    const liveSession = liveblocks.prepareSession(user.id, {
        userInfo: user.info,
    });

    // Give the user access to the room
    liveSession.allow(String(room), liveSession.FULL_ACCESS);

    // Authorize the user and return the result
    const { status, body } = await liveSession.authorize();
    return new Response(body, { status });
}
