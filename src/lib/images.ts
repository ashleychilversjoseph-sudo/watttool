import type { PhotoAsset } from '../types';

export async function preparePhoto(file: File, label = 'Site photo'): Promise<PhotoAsset> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Photo is too large. Choose one under 15 MB.');

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the photo.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not decode the photo.'));
    element.src = source;
  });
  const scale = Math.min(1, 1440 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo processing is unavailable.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    src: canvas.toDataURL('image/jpeg', 0.76),
    label,
    createdAt: new Date().toISOString(),
  };
}
