"use client";

import { useId } from "react";

const BTC_B_PATH = "M45.3 29.1c.6-4.2-2.6-6.5-7-8l1.4-5.7-3.5-.9-1.4 5.5-2.8-.7 1.4-5.5-3.5-.9-1.4 5.7-2.2-.5-4.8-1.2-1 3.7s2.6.6 2.5.7c1.4.4 1.7 1.3 1.6 2l-1.6 6.5c.1 0 .2.1.3.1l-.3-.1-2.3 9.1c-.2.4-.5 1.1-1.4.8 0 0-2.5-.6-2.5-.6l-1.7 4 4.5 1.1 2.5.6-1.4 5.8 3.5.9 1.4-5.7 2.8.7-1.4 5.6 3.5.9 1.4-5.8c5.9 1.1 10.3.7 12.2-4.7 1.5-4.3-.1-6.8-3.2-8.4 2.3-.5 4-2 4.4-5.1zm-7.9 11c-1.1 4.3-8.3 2-10.7 1.4l1.9-7.6c2.4.6 9.9 1.7 8.8 6.2zm1.1-11.1c-1 3.9-7 1.9-9 1.4l1.7-6.9c2 .5 8.3 1.4 7.3 5.5z";

export function BtcIcon() {
  const gradId = useId();
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${gradId})`} />
      <path fill="white" d={BTC_B_PATH} />
    </svg>
  );
}

export function BtcSkeletonIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-20">
      <circle cx="32" cy="32" r="32" fill="white" fillOpacity={0.3} />
      <path fill="white" d={BTC_B_PATH} />
    </svg>
  );
}

export function AlkaneSkeletonIcon() {
  const maskId = useId();
  return (
    <svg viewBox="0 0 75 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-30">
      <path
        fill="white"
        d="M32.042 2.084a10.87 10.87 0 0 1 10.914.168L69.624 17.46c3.399 2 5.453 5.68 5.375 9.625v30.75a10.916 10.916 0 0 1-5.375 9.626L42.956 82.835a10.88 10.88 0 0 1-10.914 0L5.374 67.46c-3.398-2-5.453-5.68-5.375-9.625v-30.75a10.917 10.917 0 0 1 5.375-9.626L32.042 2.085Zm10.33 4.008a9.675 9.675 0 0 0-9.749-.151L8.801 19.734a9.802 9.802 0 0 0-4.802 8.635v27.585a9.802 9.802 0 0 0 4.802 8.634L32.623 78.38a9.682 9.682 0 0 0 9.75 0l23.822-13.792a9.802 9.802 0 0 0 4.8-8.634V28.369a9.802 9.802 0 0 0-4.8-8.635L42.372 6.092Z"
      />
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="75" height="84" style={{ maskType: "alpha" } as React.CSSProperties}>
        <path
          fill="red"
          d="m43.131 2.491 26.31 15.097a10.852 10.852 0 0 1 5.304 9.556V57.67a10.851 10.851 0 0 1-5.303 9.556L43.13 82.49a10.675 10.675 0 0 1-10.768 0L6.053 67.227A10.852 10.852 0 0 1 .748 57.67V27.144a10.852 10.852 0 0 1 5.303-9.556L32.363 2.324a10.667 10.667 0 0 1 10.768.167Z"
        />
      </mask>
      <g mask={`url(#${maskId})`} fill="white">
        <path fillOpacity={0.1} d="M3 60h7v7H3zM66 60h7v7h-7zM55.999 53h7v7h-7v-7ZM62.999 53h7v7h-7v-7ZM69.999 53h7v7h-7v-7ZM6.999 53h7v7h-7v-7ZM13.999 53h7v7h-7v-7ZM-.001 53h7v7h-7v-7ZM72.747 24.948h-7v-7h7zM9.747 24.948h-7v-7h7zM19.748 31.948h-7v-7h7v7ZM12.748 31.948h-7v-7h7v7ZM5.748 31.948h-7v-7h7v7ZM68.748 31.948h-7v-7h7v7ZM61.748 31.948h-7v-7h7v7ZM75.748 31.948h-7v-7h7v7Z" />
        <path fillOpacity={0.2} d="M34.747 38.948h6v7h-6z" />
        <path fillOpacity={0.3} d="M10 60h7v7h-7zM59 60h7v7h-7zM21 53h7v7h-7zM49 53h7v7h-7zM65.747 24.948h-7v-7h7zM16.747 24.948h-7v-7h7zM54.747 31.948h-7v-7h7zM26.747 31.948h-7v-7h7z" />
        <path fillOpacity={0.4} d="M44.747 52.948h-14v-7h14zM31 32h14v7H31z" />
        <path fillOpacity={0.5} d="M17 60h7v7h-7zM52 60h7v7h-7zM58.747 24.948h-7v-7h7zM23.747 24.948h-7v-7h7z" />
        <path d="M53 67H24v-7h29zM49 60H28v-7h21zM69.747 83.948h-64v-17h64zM22.747 17.948h29v7h-29zM26.747 24.948h21v7h-21zM6 1h64v17H6z" />
      </g>
    </svg>
  );
}
