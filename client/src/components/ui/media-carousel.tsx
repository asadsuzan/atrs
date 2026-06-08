import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileVideo } from 'lucide-react';
import { MediaLightbox } from './media-lightbox';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface MediaCarouselProps {
  urls: string[];
  title?: string;
  className?: string;
}

export function MediaCarousel({ urls, title, className }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!urls || urls.length === 0) return null;

  const isVideo = (url: string) => !!url.match(/\.(mp4|webm|ogg)$/i);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  const currentUrl = urls[currentIndex];
  const isCurrentVideo = isVideo(currentUrl);

  // Single Image Rendering
  if (urls.length === 1) {
    return (
      <div className={cn("relative group rounded-xl overflow-hidden shadow-sm border border-border/10 max-w-2xl bg-muted/10 dark:bg-muted/5 mx-auto", className)}>
        <MediaLightbox mediaUrl={currentUrl} mediaType={isCurrentVideo ? 'video' : 'image'}>
          <div className="relative w-full aspect-video flex items-center justify-center cursor-zoom-in p-2">
            {isCurrentVideo ? (
              <video src={currentUrl} className="w-full h-full object-contain drop-shadow-sm" />
            ) : (
              <img src={currentUrl} alt={title || "Media"} className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.01]" />
            )}
          </div>
        </MediaLightbox>
      </div>
    );
  }

  // Multiple Images Gallery Rendering
  return (
    <div className={cn("flex flex-col gap-2 max-w-2xl mx-auto", className)}>
      {/* Main Stage */}
      <div className="relative group rounded-xl overflow-hidden shadow-sm border border-border/10 w-full bg-muted/10 dark:bg-muted/5 aspect-video">
        <MediaLightbox mediaUrl={currentUrl} mediaType={isCurrentVideo ? 'video' : 'image'}>
          <div className="relative w-full h-full flex items-center justify-center cursor-zoom-in overflow-hidden p-2">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`fg-${currentIndex}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full h-full flex items-center justify-center"
              >
                {isCurrentVideo ? (
                  <video src={currentUrl} className="w-full h-full object-contain drop-shadow-sm" />
                ) : (
                  <img src={currentUrl} alt={`${title} ${currentIndex + 1}`} className="w-full h-full object-contain drop-shadow-sm" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </MediaLightbox>

        {/* Navigation Buttons */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={prev}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-md border-border/50 shadow-xl hover:bg-background hover:scale-110 transition-all pointer-events-auto"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={next}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-md border-border/50 shadow-xl hover:bg-background hover:scale-110 transition-all pointer-events-auto"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Pagination Indicator (for mobile) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md pointer-events-none z-20 sm:hidden">
           <span className="text-xs font-medium text-white tracking-widest">{currentIndex + 1} / {urls.length}</span>
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="flex gap-2 overflow-x-auto py-1 px-1 -mx-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .flex::-webkit-scrollbar {
              display: none;
          }
        `}} />
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={cn(
              "relative h-12 w-[68px] rounded-md overflow-hidden shrink-0 transition-all duration-300",
              currentIndex === i 
                ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-[1.02] shadow-sm" 
                : "opacity-60 hover:opacity-100 hover:scale-[1.02]"
            )}
          >
            {isVideo(url) ? (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                 <FileVideo className="w-6 h-6 text-muted-foreground opacity-50" />
              </div>
            ) : (
              <img src={url} className="w-full h-full object-cover" alt={`Thumbnail ${i + 1}`} />
            )}
            {/* Optional subtle overlay for unselected */}
            {currentIndex !== i && <div className="absolute inset-0 bg-black/10 dark:bg-black/40 transition-colors" />}
          </button>
        ))}
      </div>
    </div>
  );
}
