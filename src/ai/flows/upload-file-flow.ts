'use server';
/**
 * @fileOverview A server action to act as a proxy for uploading files to Firebase Storage, bypassing client-side CORS issues.
 */
import { getFirebaseConfig } from '@/firebase/config';
import { randomUUID } from 'crypto';

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
    
    // Step 1: Use the GCS simple upload endpoint, which is correct for a single POST request with file data.
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(filePath)}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${authToken}`,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      console.error('Firebase Storage upload failed:', uploadResponse.status, errorBody);
      throw new Error(`Storage upload failed with status ${uploadResponse.status}. Please check server logs for details.`);
    }
    
    // Step 2: Generate a download token and update the file's metadata to create a public Firebase URL.
    // The simple GCS upload endpoint does not create this token by default.
    const downloadToken = randomUUID();
    const metadataUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(filePath)}`;
    
    const metadataPatchResponse = await fetch(metadataUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
            metadata: {
                firebaseStorageDownloadTokens: downloadToken
            }
        })
    });

    if (!metadataPatchResponse.ok) {
        const errorBody = await metadataPatchResponse.text();
        console.error('Failed to update metadata with download token:', metadataPatchResponse.status, errorBody);
        throw new Error('File uploaded, but failed to create a public access token.');
    }
    
    const finalMetadata = await metadataPatchResponse.json();

    // Step 3: Construct the public Firebase Storage download URL.
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(finalMetadata.name)}?alt=media&token=${downloadToken}`;

    const output: UploadOutput = {
      downloadURL,
      fullPath: finalMetadata.name,
      name: finalMetadata.name.split('/').pop() || 'unknown',
      size: Number(finalMetadata.size),
      contentType: finalMetadata.contentType,
    };
    
    return { data: output };

  } catch (err: any) {
    console.error('Error in uploadFile server action:', err);
    return { error: err.message || 'An unknown error occurred during upload.' };
  }
}
