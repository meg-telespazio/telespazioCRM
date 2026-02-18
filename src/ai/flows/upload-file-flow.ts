'use server';
/**
 * @fileOverview A server action to act as a proxy for uploading files to Firebase Storage, bypassing client-side CORS issues.
 */
import { getFirebaseConfig } from '@/firebase/config';

type UploadOutput = {
  downloadURL: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
};

export async function uploadFile(
  formData: FormData
): Promise<{ data?: UploadOutput; error?: string }> {
  try {
    const file = formData.get('file') as File | null;
    const filePath = formData.get('filePath') as string | null;
    const contentType = formData.get('contentType') as string | null;
    const authToken = formData.get('authToken') as string | null;

    if (!file || !filePath || !contentType || !authToken) {
        throw new Error('Invalid upload arguments. Missing file, path, content type, or auth token.');
    }

    const config = getFirebaseConfig();
    const bucket = config.storageBucket;

    if (!bucket) {
      throw new Error('Firebase Storage bucket is not configured.');
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(filePath)}`;

    const response = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${authToken}`,
        'Content-Length': fileBuffer.length.toString(),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Firebase Storage upload failed:', response.status, errorBody);
      throw new Error(`Storage upload failed with status ${response.status}. Please check server logs for details.`);
    }

    const metadata = await response.json();
    
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(metadata.name)}?alt=media&token=${metadata.downloadTokens}`;

    const output: UploadOutput = {
      downloadURL,
      fullPath: metadata.name,
      name: metadata.name.split('/').pop() || 'unknown',
      size: Number(metadata.size),
      contentType: metadata.contentType,
    };
    
    return { data: output };

  } catch (err: any) {
    console.error('Error in uploadFile server action:', err);
    return { error: err.message || 'An unknown error occurred during upload.' };
  }
}
