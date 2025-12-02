import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

// Hardcoded credentials from user chat to bypass env issues
const accountId = "ed89c2b2b122e80fec76f6c9e34fb21b";
const accessKeyId = "6ccffcc1f24c3a73584c23d8042bc946";
const secretAccessKey = "f24f5ed289691960b94d7583d723e24b8e83c075d3d992bb81f486cdd89f2854";
const bucketName = "bobnote";

const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    },
});

async function main() {
    console.log("Configuring CORS for bucket:", bucketName);

    try {
        await R2.send(
            new PutBucketCorsCommand({
                Bucket: bucketName,
                CORSConfiguration: {
                    CORSRules: [
                        {
                            AllowedHeaders: ["*"],
                            AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
                            AllowedOrigins: ["*"], // For development
                            ExposeHeaders: ["ETag"],
                            MaxAgeSeconds: 3000,
                        },
                    ],
                },
            })
        );
        console.log("Successfully configured CORS!");
    } catch (error) {
        console.error("Error configuring CORS:", error);
        process.exit(1);
    }
}

main();
