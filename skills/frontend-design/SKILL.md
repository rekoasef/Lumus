---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

## Lumus Design System Context

This project has a defined design system. Respect it and build ON TOP of it, not against it:

- **Base accent**: `#7c6dfa` (violeta Lumus)
- **Dark background**: `#0a0a0f` base, `#111118` surface
- **Light background**: `#fafafa` base, `#ffffff` surface
- **Font**: Geist Sans (intentional choice — do NOT override)
- **Border radius**: sm=4px, md=8px, lg=12px, xl=16px
- **Animations**: Framer Motion for page transitions and key moments

Within these constraints, bring intentionality and craft to every component.

## Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Within the Geist font, use weight, size, and tracking creatively. Letter-spacing, line-height, and weight contrast create visual hierarchy.
- **Color & Theme**: Use the defined CSS variables. Create depth with opacity variants, gradients, and the module-specific accent colors.
- **Motion**: Use Framer Motion for high-impact moments. One well-orchestrated entrance animation with staggered reveals creates more delight than scattered micro-interactions. Hover states that surprise. Page transitions that feel intentional.
- **Spatial Composition**: Unexpected layouts within the grid. Generous negative space. Elements that breathe. Controlled density in data-heavy views.
- **Backgrounds & Visual Details**: Create atmosphere — gradient meshes, subtle noise textures, layered transparencies, dramatic shadows, decorative borders.

## Module-Specific Colors

Each module has its accent color. Use it for icons, borders, highlights, and backgrounds (with low opacity):

- Organización: `#7c6dfa`
- Finanzas: `#22c55e`
- Comidas: `#f97316`
- Fit: `#ef4444`
- Hábitos: `#3b82f6`
- Journal: `#ec4899`
- Relaciones: `#f59e0b`
- Estudio: `#06b6d4`

## NEVER do this in Lumus

- ❌ White background with purple gradient (cliché)
- ❌ Override Geist font with Inter, Roboto, or system fonts
- ❌ Cookie-cutter card layouts without contextual adaptation
- ❌ Animation on every hover without purpose
- ❌ Color palettes without clear hierarchy
- ❌ Generic loading spinners — use thoughtful skeleton states
- ❌ Generic empty states — make them contextual and slightly delightful

## Implementation Rules

- Use `shadcn/ui` as the component base, customize with Tailwind CSS variables
- Use Framer Motion for `motion.div` wrappers, `AnimatePresence` for exits
- CSS variables for all colors — never hardcode hex values inline
- Responsive first: design for 390px width, enhance for desktop
- Use `cn()` utility for conditional classnames
- Bottom navigation on mobile, sidebar on desktop

Remember: Lumus's visual identity is premium, dark, minimal, and modern. Every component should feel like it belongs to a cohesive product — not like it was assembled from templates.
