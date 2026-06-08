import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Maximize2 } from 'lucide-react';

export function MediaLightbox({ mediaUrl, mediaType, children }: { mediaUrl: string, mediaType: string, children: React.ReactNode }) {
  if (!mediaUrl) return <>{children}</>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer relative group">
          {children}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
            <div className="bg-black/50 p-2 rounded-full text-white backdrop-blur-sm">
              <Maximize2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-screen-xl w-[90vw] p-0 bg-transparent border-none shadow-none flex justify-center [&>button]:text-white [&>button]:bg-black/50 [&>button]:p-2 [&>button]:rounded-full [&>button]:hover:bg-black/70">
        <div className="relative flex items-center justify-center w-full h-full max-h-[85vh]">
          {mediaType === 'video' ? (
            <video src={mediaUrl} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain bg-black/20" />
          ) : (
            <img src={mediaUrl} alt="Fullscreen Media" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain bg-black/20" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
