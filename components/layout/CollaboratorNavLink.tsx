'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { springSoft } from '@/lib/motion'

export function CollaboratorNavLink({
  href,
  active,
  pulse,
  children,
}: {
  href: string
  active: boolean
  pulse?: boolean
  children: React.ReactNode
}) {
  return (
    <Link href={href} prefetch={false} className="block">
      <motion.div
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.98 }}
        transition={springSoft}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
          active
            ? 'bg-primary/10 text-primary border border-primary/30'
            : pulse
              ? 'text-amber-600 bg-amber-50 border border-amber-200 animate-pulse'
              : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
        }`}
      >
        {children}
      </motion.div>
    </Link>
  )
}
