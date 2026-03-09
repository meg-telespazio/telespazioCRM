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
 * Sube un archivo a una ruta específica en el bucket de Google Cloud.
 */
export async function uploadFile(
  storage: FirebaseStorage,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; path: string; name: string; size: number; type: string }> {
  // Firebase Storage no permite rutas que empiecen con /
  const cleanPath = path.replace(/^\//, '');
  const storageRef = ref(storage, cleanPath);
  
  const metadata = {
    contentType: file.type || 'application/octet-stream',
  };

  // Iniciamos la tarea de subida
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // Evitamos que se quede en 0% visualmente si ya empezó
        if (onProgress) onProgress(Math.max(progress, 1));
      },
      (error) => {
        // Log detallado para depuración en consola
        console.error('Error detallado de Firebase Storage:', error);
        
        // El error de CORS suele manifestarse como 'storage/unknown' o error de red
        if (error.code === 'storage/unknown' || error.message.includes('Access-Control-Allow-Origin')) {
          const corsError = new Error('CORS_ERROR');
          reject(corsError);
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
          console.error('Error al obtener la URL de descarga:', urlError);
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
