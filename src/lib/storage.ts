
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
 * Sube un archivo a una ruta específica en el bucket.
 */
export async function uploadFile(
  storage: FirebaseStorage,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; path: string; name: string; size: number; type: string }> {
  // Limpiamos el path para evitar errores de Firebase
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const storageRef = ref(storage, cleanPath);
  
  // Forzamos los metadatos para evitar problemas de tipo MIME
  const metadata = {
    contentType: file.type || 'application/octet-stream',
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Calculamos el progreso de forma segura
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        // Logueamos el error completo para depuración
        console.error('Firebase Storage Error Detail:', error);
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
          console.error('Error al obtener URL de descarga:', urlError);
          reject(urlError);
        }
      }
    );
  });
}

export async function deleteFile(storage: FirebaseStorage, path: string) {
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const storageRef = ref(storage, cleanPath);
  return deleteObject(storageRef);
}
