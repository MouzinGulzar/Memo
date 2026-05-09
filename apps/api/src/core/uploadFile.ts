import fs from "fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2.js";

export async function uploadFile(
  filePath: string,
  key: string,
  mimeType: string
) {
  const fileBuffer = fs.readFileSync(filePath);
  return uploadFileBuffer(fileBuffer, key, mimeType);
}

export async function uploadFileBuffer(
  buffer: Buffer,
  key: string,
  mimeType: string
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    })
  );

  return key;
}
