'use client';

import { addCollection, Icon as Iconify, type IconProps as IconifyProps } from '@iconify/react';
import simpleIcons from '@iconify-json/simple-icons/icons.json';

import { cn } from '@/lib/utils';

addCollection(simpleIcons);

type IconifyIconProps = Omit<IconifyProps, 'aria-hidden' | 'aria-label' | 'icon' | 'role'> & {
  decorative?: boolean;
  label?: string;
  name: string;
};

export function IconifyIcon({
  className,
  decorative = true,
  label,
  name,
  ...props
}: IconifyIconProps) {
  return (
    <Iconify
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={cn('size-4', className)}
      icon={name}
      role={decorative ? undefined : 'img'}
      {...props}
    />
  );
}
