# LUMUS — Design System

## Filosofía Visual

El objetivo es una UI que se siente **premium, moderna y personal** — no genérica.
Inspiraciones directas: Linear, Arc Browser, Raycast, Apple, Notion.

Principios:
- **Minimalismo con carácter** — pocos elementos, pero cada uno bien definido
- **Tipografía como jerarquía** — el tamaño y peso hablan por sí solos
- **Color con propósito** — el color señaliza, no decora
- **Espaciado generoso** — respiración entre elementos
- **Micro-interacciones** — feedback inmediato en cada acción

---

## Paleta de Colores

### Dark Mode (default)

```css
/* globals.css — CSS Variables */

:root[data-theme="dark"] {
  /* Backgrounds */
  --bg-base:        #0a0a0f;   /* fondo principal — casi negro azulado */
  --bg-surface:     #111118;   /* cards, paneles */
  --bg-elevated:    #1a1a24;   /* modales, dropdowns */
  --bg-hover:       #1f1f2e;   /* hover states */

  /* Borders */
  --border:         #1e1e2e;
  --border-subtle:  #16161f;

  /* Texto */
  --text-primary:   #f0f0f5;
  --text-secondary: #8b8b9e;
  --text-muted:     #4a4a5e;

  /* Accent — Violeta Lumus */
  --accent:         #7c6dfa;   /* primario */
  --accent-hover:   #6b5ce7;
  --accent-muted:   #7c6dfa1a; /* 10% opacity */

  /* Semánticos */
  --success:        #22c55e;
  --success-muted:  #22c55e1a;
  --warning:        #f59e0b;
  --warning-muted:  #f59e0b1a;
  --danger:         #ef4444;
  --danger-muted:   #ef44441a;
  --info:           #3b82f6;
  --info-muted:     #3b82f61a;
}
```

### Light Mode

```css
:root[data-theme="light"] {
  --bg-base:        #fafafa;
  --bg-surface:     #ffffff;
  --bg-elevated:    #f4f4f8;
  --bg-hover:       #ededf5;

  --border:         #e4e4ef;
  --border-subtle:  #ededf5;

  --text-primary:   #0f0f1a;
  --text-secondary: #5a5a72;
  --text-muted:     #9494aa;

  --accent:         #7c6dfa;
  --accent-hover:   #6b5ce7;
  --accent-muted:   #7c6dfa15;

  --success:        #16a34a;
  --success-muted:  #16a34a15;
  --warning:        #d97706;
  --warning-muted:  #d9770615;
  --danger:         #dc2626;
  --danger-muted:   #dc26261a;
  --info:           #2563eb;
  --info-muted:     #2563eb1a;
}
```

---

## Tipografía

```typescript
// next/font con Geist (de Vercel — moderna, limpia, legible)
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
```

```css
/* Escala tipográfica */
--text-xs:   0.75rem;    /* 12px — labels, metadata */
--text-sm:   0.875rem;   /* 14px — body secundario */
--text-base: 1rem;       /* 16px — body principal */
--text-lg:   1.125rem;   /* 18px — subtítulos */
--text-xl:   1.25rem;    /* 20px — títulos de sección */
--text-2xl:  1.5rem;     /* 24px — títulos de página */
--text-3xl:  1.875rem;   /* 30px — headings grandes */
--text-4xl:  2.25rem;    /* 36px — display */
```

### Jerarquía visual

```
Page title    → text-2xl / font-semibold / text-primary
Section title → text-xl  / font-medium  / text-primary
Card title    → text-base / font-medium  / text-primary
Body text     → text-sm  / font-normal  / text-secondary
Label/meta    → text-xs  / font-medium  / text-muted (uppercase + tracking)
```

---

## Espaciado

Basado en múltiplos de 4px (estándar Tailwind):

```
4px  → gap entre elementos inline
8px  → padding interno de badges, chips
12px → padding interno de inputs
16px → padding de cards pequeñas
20px → padding de cards estándar
24px → padding de secciones
32px → espaciado entre secciones
48px → espaciado entre bloques grandes
```

---

## Border Radius

```css
--radius-sm:  4px;    /* tags, badges */
--radius-md:  8px;    /* inputs, buttons */
--radius-lg:  12px;   /* cards */
--radius-xl:  16px;   /* modales, panels grandes */
--radius-full: 9999px; /* avatares, pills */
```

---

## Sombras (Dark Mode)

```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
--shadow-md:  0 4px 12px rgba(0,0,0,0.4);
--shadow-lg:  0 8px 24px rgba(0,0,0,0.5);
--shadow-accent: 0 0 20px rgba(124, 109, 250, 0.15); /* glow del accent */
```

---

## Componentes Base

### Button

```tsx
// Variantes
<Button variant="default">    // bg accent, texto blanco
<Button variant="secondary">  // bg surface, borde, texto primario
<Button variant="ghost">      // transparente, hover bg-hover
<Button variant="destructive"> // bg danger
<Button size="sm" | "md" | "lg" | "icon">
```

### Card

```tsx
<Card>
  // bg-surface, borde border, border-radius-lg, padding-5
  // hover: border accent/20 con transición suave
</Card>
```

### Input

```tsx
<Input>
  // bg-elevated, borde border, focus: ring accent
  // placeholder text-muted
```

### Badge / Tag

```tsx
<Badge variant="default">   // accent muted bg
<Badge variant="success">
<Badge variant="warning">
<Badge variant="danger">
```

---

## Layout

### Desktop (≥ 1024px)

```
┌─────────────────────────────────────────────┐
│  Sidebar (240px fijo)  │  Main Content       │
│                        │                     │
│  Logo                  │  Page Header        │
│  Navigation items      │  ─────────────────  │
│  ─────────────────     │  Content            │
│  Notifications         │                     │
│  User Avatar           │                     │
│  Theme Toggle          │                     │
└─────────────────────────────────────────────┘
```

### Mobile (< 1024px)

```
┌──────────────────┐
│  Top Bar         │  → Logo + Campanita + Avatar
│  ─────────────── │
│                  │
│  Content         │
│                  │
│                  │
│  ─────────────── │
│  Bottom Nav      │  → 5 iconos principales
└──────────────────┘
```

### Bottom Nav Mobile — Items

```
Dashboard | Organización | Finanzas | Hábitos | Más (...)
```

---

## Animaciones con Framer Motion

```typescript
// src/lib/utils/animations.ts

// Fade in suave para páginas y modales
export const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: 'easeOut' }
}

// Scale para cards y botones
export const scaleIn = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.15 }
}

// Slide para sidebar y panels
export const slideFromLeft = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: 0.2 }
}

// Stagger para listas
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
}

export const staggerItem = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 }
}
```

---

## Iconos

Librería: `lucide-react` — iconos consistentes, outline, modernos.

```typescript
import { CheckSquare, DollarSign, Dumbbell, BookOpen, Heart, Users, Brain, LayoutDashboard } from 'lucide-react'

// Mapeo de módulos a iconos
const MODULE_ICONS = {
  dashboard:    LayoutDashboard,
  organizacion: CheckSquare,
  finanzas:     DollarSign,
  comidas:      UtensilsCrossed,
  fit:          Dumbbell,
  habitos:      Brain,
  journal:      BookOpen,
  relaciones:   Users,
  estudio:      GraduationCap,
}
```

---

## Colores por Módulo

Cada módulo tiene su color de acento para diferenciarse visualmente:

| Módulo | Color | Hex |
|---|---|---|
| Organización | Violeta (accent) | #7c6dfa |
| Finanzas | Verde | #22c55e |
| Comidas | Naranja | #f97316 |
| Fit & Salud | Rojo | #ef4444 |
| Hábitos | Azul | #3b82f6 |
| Journal | Rosa | #ec4899 |
| Relaciones | Amber | #f59e0b |
| Estudio | Cyan | #06b6d4 |

---

## Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#7c6dfa',
          hover: '#6b5ce7',
          muted: 'rgba(124, 109, 250, 0.1)',
        },
        surface: {
          base: 'var(--bg-base)',
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
    },
  },
}
```
