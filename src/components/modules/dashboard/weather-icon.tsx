'use client'

import { motion } from 'framer-motion'

export type WeatherCondition =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'foggy'
  | 'drizzle'
  | 'rainy'
  | 'snowy'
  | 'stormy'

interface Props {
  condition: WeatherCondition
  size?: number
}

function SunBody({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <defs>
        <radialGradient id="sunG" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <filter id="sunGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="url(#sunG)"
        filter="url(#sunGlow)"
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
    </>
  )
}

function SunRays({
  cx, cy, innerR, outerR, count = 8, color = '#fbbf24',
}: {
  cx: number; cy: number; innerR: number; outerR: number; count?: number; color?: string
}) {
  const lines = Array.from({ length: count }).map((_, i) => {
    const rad = ((i * 360) / count) * (Math.PI / 180)
    return {
      x1: cx + innerR * Math.sin(rad),
      y1: cy - innerR * Math.cos(rad),
      x2: cx + outerR * Math.sin(rad),
      y2: cy - outerR * Math.cos(rad),
    }
  })

  return (
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1}
          x2={l.x2} y2={l.y2}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </motion.g>
  )
}

function CloudShape({
  cx, cy, fill = 'rgba(210,220,235,0.95)',
}: {
  cx: number; cy: number; fill?: string
}) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={18} ry={12} fill={fill} />
      <ellipse cx={cx - 11} cy={cy + 4} rx={12} ry={9} fill={fill} />
      <ellipse cx={cx + 11} cy={cy + 4} rx={12} ry={9} fill={fill} />
      <ellipse cx={cx} cy={cy + 8} rx={18} ry={7} fill={fill} />
    </g>
  )
}

export function WeatherIcon({ condition, size = 72 }: Props) {
  const v = 72
  const scale = size / v

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${v} ${v}`}
      fill="none"
      style={{ overflow: 'visible' }}
    >
      {condition === 'sunny' && (
        <>
          <SunRays cx={36} cy={36} innerR={20} outerR={28} />
          <SunBody cx={36} cy={36} r={16} />
        </>
      )}

      {condition === 'partly-cloudy' && (
        <>
          {/* Small sun peeking behind */}
          <SunRays cx={26} cy={28} innerR={14} outerR={20} count={6} color="#fcd34d" />
          <circle cx={26} cy={28} r={10} fill="#f59e0b" />
          {/* Cloud in front */}
          <motion.g
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CloudShape cx={44} cy={42} />
          </motion.g>
        </>
      )}

      {condition === 'cloudy' && (
        <>
          {/* Back cloud */}
          <motion.g
            animate={{ x: [-1, 1, -1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CloudShape cx={44} cy={30} fill="rgba(170,185,200,0.6)" />
          </motion.g>
          {/* Front cloud */}
          <motion.g
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CloudShape cx={32} cy={42} />
          </motion.g>
        </>
      )}

      {condition === 'foggy' && (
        <>
          <CloudShape cx={36} cy={28} fill="rgba(190,200,215,0.7)" />
          {[42, 51, 59].map((y, i) => (
            <motion.rect
              key={y}
              x={8 + i * 3} y={y}
              width={58 - i * 8} height={3.5}
              rx={1.75}
              fill="rgba(170,185,205,0.65)"
              animate={{ opacity: [0.5, 1, 0.5], x: [0, 2, 0] }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.4,
              }}
            />
          ))}
        </>
      )}

      {(condition === 'drizzle' || condition === 'rainy') && (
        <>
          <CloudShape cx={36} cy={29} fill="rgba(130,150,175,0.92)" />
          {(condition === 'rainy' ? [18, 27, 36, 45, 54] : [22, 36, 50]).map((x, i) => (
            <motion.ellipse
              key={x}
              cx={x} cy={50}
              rx={2.5} ry={5.5}
              fill="rgba(100,150,220,0.8)"
              animate={{ y: [0, 14], opacity: [0, 1, 0] }}
              transition={{
                duration: 1.3,
                repeat: Infinity,
                delay: i * 0.22,
                ease: 'easeIn',
              }}
            />
          ))}
        </>
      )}

      {condition === 'snowy' && (
        <>
          <CloudShape cx={36} cy={28} fill="rgba(200,215,235,0.95)" />
          {[19, 31, 43, 55].map((x, i) => (
            <motion.g
              key={x}
              animate={{ y: [0, 14], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
            >
              {[0, 60, 120].map(a => {
                const rad = (a * Math.PI) / 180
                return (
                  <line
                    key={a}
                    x1={x - 5 * Math.sin(rad)} y1={52 - 5 * Math.cos(rad)}
                    x2={x + 5 * Math.sin(rad)} y2={52 + 5 * Math.cos(rad)}
                    stroke="rgba(170,210,245,0.9)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )
              })}
            </motion.g>
          ))}
        </>
      )}

      {condition === 'stormy' && (
        <>
          <CloudShape cx={36} cy={28} fill="rgba(90,100,120,0.95)" />
          <motion.path
            d="M38 44 L30 58 L37 58 L29 72 L46 52 L38 52 Z"
            fill="#fde047"
            animate={{ opacity: [1, 0.15, 1, 0.6, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
    </svg>
  )
}

export function getConditionFromCode(code: number): WeatherCondition {
  if (code === 0) return 'sunny'
  if (code <= 2) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if (code <= 48) return 'foggy'
  if (code <= 55) return 'drizzle'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snowy'
  if (code <= 82) return 'rainy'
  if (code <= 86) return 'snowy'
  return 'stormy'
}

export const CONDITION_LABELS: Record<WeatherCondition, string> = {
  sunny: 'Despejado',
  'partly-cloudy': 'Parcialmente nublado',
  cloudy: 'Nublado',
  foggy: 'Niebla',
  drizzle: 'Llovizna',
  rainy: 'Lluvia',
  snowy: 'Nieve',
  stormy: 'Tormenta',
}
