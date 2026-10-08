/**
 * Client-side image compression utility for MannaTic.
 * Automatically resizes and compresses photos before upload or storage,
 * preventing 'Storage quota exceeded' errors and accelerating uploads on mobile devices.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.8)
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Compresses an image File or Data URL.
 * If the input is not an image (e.g. PDF), it converts the File to Data URL without modification.
 */
export async function compressImage(
  input: File | string,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  // If in SSR or no window, return as is or read as string
  if (typeof window === 'undefined') {
    if (typeof input === 'string') return input;
    return '';
  }

  // If non-image File (e.g. PDF or document), read standard data URL without canvas
  if (input instanceof File && !input.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(input);
    });
  }

  // Get data URL source
  const dataUrl: string = typeof input === 'string'
    ? input
    : await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(input);
      });

  // If not a data:image, return directly
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // Load into Image element for canvas resizing
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(dataUrl);
          return;
        }

        // Calculate aspect ratio scale
        let scale = 1;
        if (width > maxWidth || height > maxHeight) {
          scale = Math.min(maxWidth / width, maxHeight / height);
        }

        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Better scaling quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Export compressed image
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);

        // Only use compressed version if it is actually smaller or was resized
        if (compressedDataUrl.length < dataUrl.length || scale < 1) {
          resolve(compressedDataUrl);
        } else {
          resolve(dataUrl);
        }
      } catch (err) {
        console.warn('Image compression fallback to original:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

/**
 * Shortcut for avatars: max 400x400, quality 0.8 (keeps avatar < 50KB)
 */
export async function compressAvatar(input: File | string): Promise<string> {
  return compressImage(input, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    mimeType: 'image/jpeg',
  });
}

/**
 * Shortcut for logos: max 600x600, quality 0.85
 */
export async function compressLogo(input: File | string): Promise<string> {
  return compressImage(input, {
    maxWidth: 600,
    maxHeight: 600,
    quality: 0.85,
    mimeType: 'image/jpeg',
  });
}

/**
 * Shortcut for intervention and ticket attachments: max 1600x1600, quality 0.78 (keeps photos < 300KB)
 */
export async function compressAttachment(input: File | string): Promise<string> {
  return compressImage(input, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.78,
    mimeType: 'image/jpeg',
  });
}
