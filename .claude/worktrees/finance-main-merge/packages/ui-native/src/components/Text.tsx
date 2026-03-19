import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
}

const variantStyles: Record<NonNullable<TextProps['variant']>, string> = {
  h1: 'text-2xl font-bold text-neutral-100',
  h2: 'text-xl font-semibold text-neutral-100',
  h3: 'text-lg font-semibold text-neutral-200',
  body: 'text-base text-neutral-300',
  caption: 'text-sm text-neutral-400',
  label: 'text-xs font-medium uppercase tracking-wider text-neutral-500',
};

export function Text({ variant = 'body', className, ...props }: TextProps) {
  return (
    <RNText
      className={`${variantStyles[variant]} ${className || ''}`}
      {...props}
    />
  );
}
