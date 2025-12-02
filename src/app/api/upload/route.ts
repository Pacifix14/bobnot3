import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { filename, contentType } = (await req.json()) as { filename: string; contentType: string };

        const uniqueFilename = `${session.user.id}/${Date.now()}-${filename}`;

        const signedUrl = await getSignedUrl(
            R2,
            new PutObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: uniqueFilename,
                ContentType: contentType,
            }),
            { expiresIn: 3600 }
        );

        // Construct the public URL (assuming public access is enabled or using a custom domain)
        // For R2, if public access is enabled, it's usually https://<bucket>.<account>.r2.dev/<key>
        // Or if a custom domain is set up. For now, we'll try to use the worker/public URL if available, 
        // or just return the key and handle it on the client if we had a public domain.
        // However, without a custom domain, R2 buckets aren't publicly accessible by default unless configured.
        // We will assume the user has public access enabled or we might need a worker.
        // For now, let's return the signed URL for upload and a "public" URL guess.

        // NOTE: This public URL might need adjustment based on user's specific R2 setup (custom domain vs r2.dev)
        // We'll use a placeholder or the r2.dev subdomain if we can guess it, but r2.dev needs enabling.
        // Let's assume standard R2 public bucket access for now:
        // https://pub-<hash>.r2.dev/<key> is common but unpredictable.
        // SAFEST BET: Use a worker or custom domain.
        // Since we don't have that info, we'll return the key and maybe a constructed URL.
        // Let's assume the user will configure a public domain in env later if needed, 
        // or we can proxy the image through our own API (slower).

        // For this implementation, we'll return the Key. 
        // And we'll try to construct a URL assuming they might have a custom domain or we can use a presigned GET url for viewing (secure but expires).
        // Let's use Presigned GET for viewing if we want to be secure and zero-config.

        return NextResponse.json({
            uploadUrl: signedUrl,
            fileKey: uniqueFilename,
            // We'll also return a read URL if we want to use presigned URLs for reading too
            // But for a public page, we want a permanent URL.
            // Let's assume they have a public domain variable or we'll just use the key for now.
        });
    } catch (error) {
        console.error("Error generating signed URL:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
