'use client'

import { ReactNode } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { pageFade, cardIn, staggerContainer, staggerItem, pressable, springSnappy } from '@/lib/motion'

/** Fade-in ao entrar na página — envolver o conteúdo principal */
export function PageFade({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={pageFade.initial}
      animate={pageFade.animate}
      exit={pageFade.exit}
      transition={pageFade.transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Card com entrada suave */
export function MotionCard({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={cardIn.initial}
      animate={cardIn.animate}
      transition={{ ...cardIn.transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Container que anima filhos em sequência */
export function Stagger({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Filho do Stagger */
export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

/** Botão genérico com press (para usar fora do Button do design system) */
export function MotionPress({
  children,
  className = '',
  disabled,
  ...props
}: HTMLMotionProps<'button'> & { children: ReactNode }) {
  return (
    <motion.button
      disabled={disabled}
      whileHover={disabled ? undefined : pressable.whileHover}
      whileTap={disabled ? undefined : pressable.whileTap}
      transition={springSnappy}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

/** Div clicável com feedback de press */
export function MotionDiv({
  children,
  className = '',
  ...props
}: HTMLMotionProps<'div'> & { children: ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={springSnappy}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
