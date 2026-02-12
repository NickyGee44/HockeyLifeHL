import Image from 'next/image';
import { TeamLogo as BaseTeamLogo, type TeamLogoProps as BaseProps } from '@hockey-life/ui';

type TeamLogoProps = Omit<BaseProps, 'renderImage'>;

export function TeamLogo(props: TeamLogoProps) {
  return (
    <BaseTeamLogo
      {...props}
      renderImage={({ src, alt, width, height, className }) => (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          style={{ width, height }}
        />
      )}
    />
  );
}

export default TeamLogo;
