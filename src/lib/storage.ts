'use client';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  type FirebaseStorage 
} from 'firebase/storage';

export type UploadProgressCallback = (progress: number) => void;

/**
 * Sube un archivo a una ruta específica en el bucket de Firebase.
 * Maneja específicamente errores de CORS y Permisos para diagnóstico.
 */
export async function uploadFile(
  storage: FirebaseStorage,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; path: string; name: string; size: number; type: string }> {
  const cleanPath = path.replace(/^\//, '');
  const storageRef = ref(storage, cleanPath);
  
  const metadata = {
    contentType: file.type || 'application/octet-stream',
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.max(1, progress));
      },
      (error: any) => {
        const errorDetail = {
          code: error?.code,
          message: error?.message,
          path: cleanPath,
          bucket: storage.app.options.storageBucket
        };
        
        console.error('Detailed Storage Error:', errorDetail);
        
        // Error de reglas de seguridad (Firebase Rules)
        if (errorDetail.code === 'storage/unauthorized') {
          reject(new Error('PERMISSION_DENIED'));
          return;
        }

        // Error de red o CORS
        const isNetworkOrCorsError = 
          !errorDetail.code || 
          errorDetail.code === 'storage/unknown' || 
          errorDetail.message?.toLowerCase().includes('cors') ||
          (typeof error === 'object' && Object.keys(error).length === 0);

        if (isNetworkOrCorsError) {
          reject(new Error('CORS_ERROR'));
        } else {
          reject(error);
        }
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
          console.error('Error getting download URL:', urlError);
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
