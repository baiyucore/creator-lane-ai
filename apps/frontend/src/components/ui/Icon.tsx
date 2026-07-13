'use client';

import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

export type IconName = string;

export interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  const Cmp = (Icons as unknown as Record<string, LucideIcon | undefined>)[name];

  if (!Cmp) {
    return null;
  }

  return <Cmp className={className} aria-hidden />;
}
