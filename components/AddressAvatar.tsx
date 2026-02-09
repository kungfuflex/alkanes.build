'use client';

import { useMemo } from 'react';

interface AddressAvatarProps {
  address: string | undefined;
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic gradient avatar for a Bitcoin address
 * Creates a unique radial gradient based on address hash
 */
export default function AddressAvatar({ address, size = 32, className = '' }: AddressAvatarProps) {
  const gradientId = useMemo(() => `avatar-gradient-${size}-${address?.slice(-8) || 'default'}`, [address, size]);

  const { color1, color2, color3 } = useMemo(() => {
    if (!address) {
      return { color1: '#666', color2: '#444', color3: '#333' };
    }

    // Generate a consistent hash from the address
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = ((hash << 5) - hash) + address.charCodeAt(i);
      hash = hash & hash;
    }

    // Generate three colors from the hash for a rich gradient
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 40 + (Math.abs(hash >> 4) % 40)) % 360;
    const hue3 = (hue1 + 180 + (Math.abs(hash >> 8) % 60) - 30) % 360;

    const sat1 = 70 + (Math.abs(hash >> 12) % 25);
    const sat2 = 60 + (Math.abs(hash >> 16) % 30);
    const sat3 = 50 + (Math.abs(hash >> 20) % 30);

    const light1 = 55 + (Math.abs(hash >> 24) % 15);
    const light2 = 45 + (Math.abs(hash >> 28) % 15);
    const light3 = 35 + (Math.abs(hash >> 6) % 15);

    return {
      color1: `hsl(${hue1}, ${sat1}%, ${light1}%)`,
      color2: `hsl(${hue2}, ${sat2}%, ${light2}%)`,
      color3: `hsl(${hue3}, ${sat3}%, ${light3}%)`,
    };
  }, [address]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`rounded-full ${className}`}
    >
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="50%" stopColor={color2} />
          <stop offset="100%" stopColor={color3} />
        </radialGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2}
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
