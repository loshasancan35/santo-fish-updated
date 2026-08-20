import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageOff } from 'lucide-react';

interface FadeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function FadeImage({ src, alt, className = '' }: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={`flex items-center justify-center bg-deep-50 ${className}`}>
        <ImageOff className="h-6 w-6 text-deep-300" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-deep-50 ${className}`}>
      {!loaded && <div className="skeleton absolute inset-0" />}
      <motion.img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
