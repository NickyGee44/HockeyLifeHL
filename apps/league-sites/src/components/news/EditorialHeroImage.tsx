interface EditorialHeroImageProps {
  src: string;
  alt: string;
  imageClassName?: string;
  foregroundClassName?: string;
  backgroundClassName?: string;
  mode?: 'layered' | 'hero';
}

export function EditorialHeroImage({
  src,
  alt,
  imageClassName = 'h-full w-full',
  foregroundClassName = 'object-contain object-right',
  backgroundClassName = 'object-cover opacity-28',
  mode = 'layered',
}: EditorialHeroImageProps) {
  if (mode === 'hero') {
    return (
      <div className={`relative h-full w-full overflow-hidden ${imageClassName}`}>
        <img
          src={src}
          alt={alt}
          className={`h-full w-full ${backgroundClassName}`}
        />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${imageClassName}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full scale-[1.03] ${backgroundClassName}`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_center,rgba(255,255,255,0.12),transparent_34%)]" />
      <div className="absolute inset-0 flex items-center justify-end px-2 py-2 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8">
        <img
          src={src}
          alt={alt}
          className={`h-full w-full drop-shadow-[0_24px_48px_rgba(0,0,0,0.42)] ${foregroundClassName}`}
        />
      </div>
    </div>
  );
}
