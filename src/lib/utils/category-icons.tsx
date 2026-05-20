import {
  Utensils, Car, Home, HeartPulse, GraduationCap, Shirt, Laptop, Repeat,
  Wallet, Gamepad2, Plane, ShoppingCart, Gift, Banknote, Briefcase,
  TrendingUp, PlusCircle, Coffee, Music, Dumbbell, Book, Wrench, Fuel, Dog,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  'utensils':       Utensils,
  'car':            Car,
  'home':           Home,
  'heart-pulse':    HeartPulse,
  'graduation-cap': GraduationCap,
  'shirt':          Shirt,
  'laptop':         Laptop,
  'repeat':         Repeat,
  'wallet':         Wallet,
  'gamepad-2':      Gamepad2,
  'plane':          Plane,
  'shopping-cart':  ShoppingCart,
  'gift':           Gift,
  'banknote':       Banknote,
  'briefcase':      Briefcase,
  'trending-up':    TrendingUp,
  'plus-circle':    PlusCircle,
  'coffee':         Coffee,
  'music':          Music,
  'dumbbell':       Dumbbell,
  'book':           Book,
  'wrench':         Wrench,
  'fuel':           Fuel,
  'dog':            Dog,
}

export const ICON_KEYS = Object.keys(CATEGORY_ICON_MAP)

interface CategoryIconProps {
  icon: string | null | undefined
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function CategoryIcon({ icon, size = 16, className, style }: CategoryIconProps) {
  if (!icon) return null
  const Icon = CATEGORY_ICON_MAP[icon]
  if (!Icon) return null
  return <Icon size={size} className={className} style={style} />
}
