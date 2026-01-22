/**
 * Image compression utilities for client-side image optimization
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

/**
 * Compress a single image file
 */
async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    maxSizeMB = 2,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Check if file size is acceptable
            const sizeMB = blob.size / (1024 * 1024);
            if (sizeMB > maxSizeMB) {
              // Try again with lower quality
              canvas.toBlob(
                (lowerQualityBlob) => {
                  if (!lowerQualityBlob) {
                    reject(new Error('Failed to compress image to target size'));
                    return;
                  }
                  const compressedFile = new File(
                    [lowerQualityBlob],
                    file.name,
                    { type: file.type || 'image/jpeg' }
                  );
                  resolve(compressedFile);
                },
                file.type || 'image/jpeg',
                quality * 0.7 // Reduce quality further
              );
            } else {
              const compressedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
              });
              resolve(compressedFile);
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple images
 */
export async function compressMultipleImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  try {
    const compressedFiles = await Promise.all(
      files.map((file) => {
        // Only compress image files
        if (file.type.startsWith('image/')) {
          return compressImage(file, options);
        }
        // Return non-image files as-is
        return Promise.resolve(file);
      })
    );
    return compressedFiles;
  } catch (error) {
    console.error('Error compressing images:', error);
    // Return original files if compression fails
    return files;
  }
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
