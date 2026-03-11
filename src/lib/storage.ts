'use client';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  type FirebaseStorage 
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';

export type UploadProgressCallback = (progress: number) => void;

export async function uploadFile(
  storage: FirebaseStorage,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; path: string; name: string; size: number; type: string }> {
  const cleanPath = path.replace(/^\//, '');
  const storageRef = ref(storage, cleanPath);
  
  // Diagnóstico de sesión
  const auth = getAuth(storage.app);
  const currentUser = auth.currentUser;
  
  const metadata = {
    contentType: file.type || 'application/octet-stream',
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        const errorDetail = {
          code: error.code || 'unknown',
          message: error.message || 'No message',
          path: cleanPath,
          bucket: (storage as any).app?.options?.storageBucket || 'unknown',
          authUid: currentUser?.uid || 'Not authenticated'
        };
        
        console.error(`Detailed Storage Error Info: [${errorDetail.code}] ${errorDetail.message} at path: ${errorDetail.path} (Bucket: ${errorDetail.bucket}) (AuthUID: ${errorDetail.authUid})`);
        
        if (errorDetail.code === 'storage/unauthorized') {
          reject(new Error('PERMISSION_DENIED'));
          return;
        }

        if (errorDetail.code === 'storage/unknown' || !errorDetail.code || errorDetail.message.includes('CORS')) {
          reject(new Error('CORS_ERROR'));
          return;
        }

        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: cleanPath,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        } catch (urlError) {
          reject(urlError);
        }
      }
    );
  });
}

export async function deleteFile(storage: FirebaseStorage, path: string) {
  const cleanPath = path.replace(/^\//, '');
  const storageRef = ref(storage, cleanPath);
  return deleteObject(storageRef);
}