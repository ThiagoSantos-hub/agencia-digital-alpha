/**
 * Variantes e presets de animação — Digital Alpha
 * Usar com framer-motion em todo o sistema
 */

export const springSoft = { type: 'spring' as const, stiffness: 380, damping: 28 }
export const springSnappy = { type: 'spring' as const, stiffness: 450, damping: 24 }

/** Entrada de página / painel */
export const pageFade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
}

/** Card / bloco que sobe levemente ao aparecer */
export const cardIn = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
}

/** Lista com stagger nos filhos */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
}

/** Hover/tap padrão de botão e item clicável */
export const pressable = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: springSnappy,
}

/** Item de menu lateral */
export const navItem = {
  whileHover: { x: 2 },
  whileTap: { scale: 0.98 },
  transition: springSoft,
}
