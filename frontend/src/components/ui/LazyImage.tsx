/**
 * Lazy Image Component (Phase 6-10)
 *
 * Loads images only when they enter the viewport using Intersection Observer
 */
import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  loader?: React.ReactNode;
  rootMargin?: string; // Margin around viewport for early loading
  threshold?: number; // Visibility threshold (0-1)
  onLoadSuccess?: () => void;
  onLoadError?: (error: Error) => void;
}

export function LazyImage({
  src,
  alt,
  fallback,
  loader,
  rootMargin = '50px',
  threshold = 0.01,
  className,
  onLoadSuccess,
  onLoadError,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect(); // Stop observing once in view
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoadSuccess?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    const error = new Error(`Failed to load image: ${src}`);
    onLoadError?.(error);
  };

  // Default loader
  const defaultLoader = (
    <div className="absolute inset-0 flex items-center justify-center bg-grey-100">
      <Loader2 className="w-8 h-8 text-grey-400 animate-spin" />
    </div>
  );

  // Default fallback for errors
  const defaultFallback = (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-grey-50">
      <ImageOff className="w-12 h-12 text-grey-400 mb-2" />
      <p className="text-sm text-grey-500">이미지를 불러올 수 없습니다</p>
    </div>
  );

  return (
    <div ref={imgRef} className={cn('relative', className)} {...props}>
      {/* Show loader while image is loading */}
      {isInView && !isLoaded && !hasError && (loader || defaultLoader)}

      {/* Show error fallback on failure */}
      {hasError && (fallback || defaultFallback)}

      {/* Actual image - only load when in view */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          loading="lazy" // Native lazy loading as fallback
          {...props}
        />
      )}

      {/* Placeholder when not yet in view */}
      {!isInView && (
        <div className="absolute inset-0 bg-grey-100 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Background Image variant with lazy loading
 */
interface LazyBackgroundImageProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export function LazyBackgroundImage({
  src,
  className,
  children,
  rootMargin = '50px',
  threshold = 0.01,
}: LazyBackgroundImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(divRef.current);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  // Preload image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [isInView, src]);

  return (
    <div
      ref={divRef}
      className={cn('relative', className)}
      style={
        isLoaded
          ? {
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-grey-100 animate-pulse" />
      )}
      {children}
    </div>
  );
}
