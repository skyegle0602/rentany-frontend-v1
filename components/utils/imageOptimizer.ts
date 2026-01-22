/**
 * Optimizes image URLs for card display
 * Adds query parameters for better performance and sizing
 */
export function optimizeCardImage(imageUrl: string): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return imageUrl;
  }

  // If it's already an external URL with query params, return as is
  if (imageUrl.includes('?') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // For Unsplash images, add optimization parameters
  if (imageUrl.includes('unsplash.com')) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}w=400&h=400&fit=crop&auto=format&q=80`;
  }

  // For other external URLs, you might want to use an image CDN or optimization service
  // For now, return the URL as-is
  return imageUrl;
}



