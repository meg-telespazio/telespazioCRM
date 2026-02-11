'use client';
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import getCroppedImg from '@/lib/crop-image';
import { useI18n } from '@/firebase/client-provider';

interface AvatarCropperProps {
  imageSrc: string | null;
  onCropComplete: (croppedImageUrl: string) => void;
  onClose: () => void;
  aspect?: number;
}

export function AvatarCropper({
  imageSrc,
  onCropComplete,
  onClose,
  aspect = 1,
}: AvatarCropperProps) {
  const { t } = useI18n();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);


  const onCropPixelsChange = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onMediaLoaded = useCallback(
    (mediaSize: { width: number; height: number }) => {
      if (!containerRef) return;
      
      const { width: containerWidth, height: containerHeight } = containerRef.getBoundingClientRect();
      const widthRatio = containerWidth / mediaSize.width;
      const heightRatio = containerHeight / mediaSize.height;
      
      const containZoom = Math.min(widthRatio, heightRatio);

      setMinZoom(containZoom);
      setZoom(containZoom); // Start with the image fully contained
      setCrop({ x: 0, y: 0 });
    },
    [containerRef]
  );

  const handleCrop = async () => {
    if (croppedAreaPixels && imageSrc) {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    }
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={!!imageSrc} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px] md:sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Profile.cropImage')}</DialogTitle>
          <DialogDescription>
            {t('Profile.cropImageDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-80 w-full bg-muted" ref={setContainerRef}>
          {containerRef && ( // Only render cropper once we have the container's ref
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={Math.max(minZoom * 5, 2)} // Allow zooming up to 5x or at least 2x
              aspect={aspect}
              cropShape={aspect === 1 ? 'round' : 'rect'}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropPixelsChange}
              onMediaLoaded={onMediaLoaded}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm">Zoom</label>
          <Slider
            value={[zoom]}
            min={minZoom}
            max={Math.max(minZoom * 5, 2)}
            step={0.01}
            onValueChange={(value) => setZoom(value[0])}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Auth.cancelLabel')}
          </Button>
          <Button onClick={handleCrop}>{t('Profile.crop')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
