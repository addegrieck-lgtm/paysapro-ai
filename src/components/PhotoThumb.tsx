import { ImageIcon } from 'lucide-react';
import { usePhotoUrl } from '../hooks/useData';

export function PhotoThumb({
  photoId,
  alt,
  quality = 'thumb',
  className = '',
}: {
  photoId: string;
  alt: string;
  quality?: 'thumb' | 'medium';
  className?: string;
}) {
  const url = usePhotoUrl(photoId, quality);
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-surface-2 text-muted ${className}`} aria-label={alt}>
        <ImageIcon className="h-6 w-6" aria-hidden />
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className}`} />;
}
