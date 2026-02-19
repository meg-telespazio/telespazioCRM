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
    
    // Use the Firebase Storage REST API endpoint directly. This is what the client SDK uses under the hood.
    // This avoids CORS issues because the request is made from the server.
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(filePath)}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        // Use the 'Firebase' auth scheme, which is expected by the Firebase Storage API for ID tokens.
        'Authorization': `Firebase ${authToken}`,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      console.error('Firebase Storage upload failed:', uploadResponse.status, errorBody);
      throw new Error(`Storage upload failed with status ${uploadResponse.status}. Please check server logs for details.`);
    }
    
    const finalMetadata = await uploadResponse.json();
    const downloadToken = finalMetadata.downloadTokens;
    
    if (!downloadToken) {
        throw new Error('File uploaded successfully, but failed to retrieve a download token.');
    }

    // Construct the public Firebase Storage download URL.
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
