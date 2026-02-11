'use client';
import { useState, useCallback, useEffect } from 'react';
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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropCompleteCallback = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (croppedAreaPixels && imageSrc) {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    }
  };

  // Reset zoom when a new image is loaded
  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  }, [imageSrc]);

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
        <div className="relative h-80 w-full bg-muted">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              minZoom={0.1} // Allow zooming out
              maxZoom={5}   // Allow zooming in
              cropShape={aspect === 1 ? 'round' : 'rect'}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropCompleteCallback}
            />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Zoom</label>
          <Slider
            value={[zoom]}
            min={0.1}
            max={5}
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
