import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/server/auth";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Get the current user's info
    const user = {
        id: session.user.id,
        info: {
            name: session.user.name || "Anonymous",
            email: session.user.email || "",
            avatar: session.user.image || "",
        },
    };

    // Create a session for the current user
    const liveSession = liveblocks.prepareSession(user.id, {
        userInfo: user.info,
    });

    // Get the room from the request body
    const { room } = await request.json();

    // Give the user access to the room
    liveSession.allow(room, liveSession.FULL_ACCESS);

    // Authorize the user and return the result
    const { status, body } = await liveSession.authorize();
    return new Response(body, { status });
}
