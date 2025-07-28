import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { addSeconds, formatISO } from "date-fns";

import env from "@/env";

// 创建 S3 客户端实例
const s3Client = new S3Client({
  region: "auto",
  endpoint: env.ENDPOINT,
  credentials: {
    accessKeyId: env.ACCESS_KEY_ID,
    secretAccessKey: env.SECRET_ACCESS_KEY,
  },
});

export interface GenerateUploadUrlParams {
  fileName: string;
  fileType?: string;
  expiresIn?: number;
}

export interface GenerateDownloadUrlParams {
  fileName: string;
  expiresIn?: number;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: string;
}

/**
 * 生成上传预签名 URL
 */
export async function generateUploadUrl(params: GenerateUploadUrlParams): Promise<PresignedUrlResult> {
  const { fileName, fileType, expiresIn = 3600 } = params;

  const command = new PutObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: fileName,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  const expiresAt = formatISO(addSeconds(new Date(), expiresIn));

  return { url, expiresAt };
}

/**
 * 生成下载预签名 URL
 */
export async function generateDownloadUrl(params: GenerateDownloadUrlParams): Promise<PresignedUrlResult> {
  const { fileName, expiresIn = 3600 } = params;

  const command = new GetObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: fileName,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  const expiresAt = formatISO(addSeconds(new Date(), expiresIn));

  return { url, expiresAt };
}
