"use client";

import { motion } from "framer-motion";

type Props = {
  name: string;
  color: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function RoyaltyAvatar({ name, color, avatarUrl, size = "md" }: Props) {
  const initial = (name.trim()[0] || "?").toUpperCase();

  if (avatarUrl) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${SIZES[size]}`}
        style={{ boxShadow: `0 0 0 2px ${color}33` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <motion.div
      className={`relative shrink-0 flex items-center justify-center rounded-full font-semibold text-background ${SIZES[size]}`}
      style={{ backgroundColor: color }}
      whileHover={{ scale: 1.04 }}
    >
      {initial}
    </motion.div>
  );
}
