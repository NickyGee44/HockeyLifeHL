import React from 'react';
import { Pressable, ActivityIndicator, type PressableProps } from 'react-native';
import { Text } from './Text';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, { container: string; text: string }> = {
  primary: {
    container: 'bg-gold-500 active:bg-gold-600',
    text: 'text-neutral-950 font-semibold',
  },
  secondary: {
    container: 'bg-neutral-800 active:bg-neutral-700',
    text: 'text-neutral-100 font-medium',
  },
  outline: {
    container: 'border border-neutral-600 active:bg-neutral-800',
    text: 'text-neutral-200 font-medium',
  },
  ghost: {
    container: 'active:bg-neutral-800',
    text: 'text-neutral-300 font-medium',
  },
  danger: {
    container: 'bg-red-600 active:bg-red-700',
    text: 'text-white font-semibold',
  },
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 rounded-lg',
  md: 'px-4 py-2.5 rounded-xl',
  lg: 'px-6 py-3.5 rounded-xl',
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`flex-row items-center justify-center ${sizeStyles[size]} ${styles.container} ${isDisabled ? 'opacity-50' : ''} ${className || ''}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#0a0a0a' : '#D4AF37'}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            className={`${styles.text} ${icon ? 'ml-2' : ''}`}
            variant="body"
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
