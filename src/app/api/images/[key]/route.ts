import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
});

export async function GET(
    req: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const session = await auth();
        // Optional: Check if user has access to the workspace/page this image belongs to.
        // For now, we'll allow authenticated users to view images if they have the link, 
        // or we could make it public if we want public pages to work for everyone.
        // If the page is public, the image should be too.
        // For simplicity in this iteration, we'll allow public access to this route 
        // (or just require session if we want to be strict, but public pages need public images).

        // NOTE: In a real app, we'd check if the image belongs to a public page or a page the user can see.
        // For now, we'll just sign the URL.

        const { key } = await params;
        const decodedKey = decodeURIComponent(key);

        const signedUrl = await getSignedUrl(
            R2,
            new GetObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: decodedKey,
            }),
            { expiresIn: 3600 } // 1 hour cache
        );

        return NextResponse.redirect(signedUrl);
    } catch (error) {
        console.error("Error generating signed view URL:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
