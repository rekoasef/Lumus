---
name: Lumus
colors:
  surface: '#13121b'
  surface-dim: '#13121b'
  surface-bright: '#3a3841'
  surface-container-lowest: '#0e0d15'
  surface-container-low: '#1c1b23'
  surface-container: '#201f27'
  surface-container-high: '#2a2932'
  surface-container-highest: '#35343d'
  on-surface: '#e5e0ed'
  on-surface-variant: '#c8c4d7'
  inverse-surface: '#e5e0ed'
  inverse-on-surface: '#312f38'
  outline: '#928ea0'
  outline-variant: '#474554'
  surface-tint: '#c6bfff'
  primary: '#c6bfff'
  on-primary: '#2800a0'
  primary-container: '#8c80ff'
  on-primary-container: '#22008d'
  inverse-primary: '#5846d4'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#ffb86e'
  on-tertiary: '#492900'
  tertiary-container: '#ce7e17'
  on-tertiary-container: '#402300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c6bfff'
  on-primary-fixed: '#160066'
  on-primary-fixed-variant: '#3f29bc'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#ffb86e'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#13121b'
  on-background: '#e5e0ed'
  surface-variant: '#35343d'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  mono-ui:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  widget-gap: 32px
---

## Brand & Style
The design system is an ultra-premium personal operating system that prioritizes cognitive clarity through a cinematic, atmospheric interface. The brand personality is sophisticated, intelligent, and discreet, acting as a high-fidelity "digital sanctuary" rather than a noisy utility.

The aesthetic fuses **Glassmorphism** with **Minimalism**, drawing inspiration from high-end hardware and modern sci-fi interfaces. It avoids the aggressive visuals of gaming software or the utilitarian density of enterprise SaaS, opting instead for deep spatial awareness, soft luminous glows, and an editorial sense of space. The goal is to evoke a sense of focused calm and technological mastery.

## Colors
The palette is rooted in a deep, "obsidian" dark mode. The core background is a pure, near-black violet (#0a0a0f), providing a high-contrast foundation for translucent layers.

- **Primary:** A luminous "Electric Lavender" (#7c6dfa) used sparingly for interactive states and focus indicators.
- **Surfaces:** Tiered greys with a subtle blue-violet shift to maintain depth and prevent a "flat" black appearance.
- **Accents:** Use of soft radial gradients and blurs to simulate light sources behind glass surfaces.
- **Functional:** Pure white is reserved for primary text to maximize legibility against the dark background, while secondary text uses a muted silver-grey.

## Typography
The typography strategy leverages a tripartite system to achieve a premium editorial feel. 

**Hanken Grotesk** serves as the display face, providing a sharp, contemporary edge to headlines with tight tracking. **Inter** is used for body content to ensure maximum readability and a neutral, systematic feel across information-dense areas. **Geist** is reserved for metadata, labels, and technical readouts, bringing a precise, developer-centric aesthetic to small-scale UI details.

Hierarchy is enforced through dramatic scale shifts rather than excessive weight. Use the `label-caps` style for section headers to evoke a sophisticated "instrument panel" vibe.

## Layout & Spacing
The layout philosophy is defined by "Modular Fluidity." Content is organized into an intelligent grid that feels like a collection of floating widgets rather than a rigid table.

- **Desktop:** A 12-column grid with generous 64px side margins to create an "island" effect in the center of the screen. 
- **Spacing Rhythm:** An 8px base unit is used for all internal padding and margins. 
- **Atmospheric Space:** Sections should use "over-sized" vertical padding (80px - 120px) to maintain the premium, cinematic feel.
- **Adaptive Widgets:** Components should reflow into a single column on mobile, with margins narrowing to 20px, but maintaining the same 8px internal scaling.

## Elevation & Depth
Depth is the core differentiator of this design system. It is achieved through **Tonal Layering** and **Luminous Glassmorphism** rather than traditional drop shadows.

1.  **Level 0 (Base):** The obsidian background (#0a0a0f).
2.  **Level 1 (Surface):** Translucent panels (15% opacity white or primary tint) with a 40px backdrop blur. These surfaces feature a subtle 1px border with a top-down linear gradient (white at 10% to white at 2%).
3.  **Level 2 (Active):** Interactive elements use a soft, inner glow and a more pronounced backdrop blur to appear closer to the user.
4.  **Atmospheric Depth:** Use large, low-opacity radial gradients (Primary Color at 5% opacity) behind key components to create a "volumetric" light effect, simulating depth in a dark space.

## Shapes
The shape language is refined and "architectural." A standard radius of 0.5rem (8px) is applied to secondary UI elements, while primary containers and cards use a more generous `rounded-xl` (1.5rem / 24px) to create a soft, organic feel that contrasts with the technical typography.

Avoid sharp 90-degree corners entirely. Interactive elements like buttons should feel like precision-milled physical objects, using the `rounded-lg` (1rem / 16px) setting to balance comfort and professional structure.

## Components
- **Buttons:** Primary buttons use a subtle gradient of the Primary color with a high-contrast white label. Secondary buttons are "ghost" style with a 1px border and a backdrop blur effect. Hover states should trigger a soft outer glow.
- **Glass Cards:** The signature container. Must include a 40px backdrop-blur, a 1px semi-transparent border, and a subtle inner-shadow (top-left) to simulate a glass edge.
- **Input Fields:** Minimalist containers with a bottom-border only in resting state, expanding to a full glass-morphic enclosure on focus.
- **Floating Insights:** Small, pill-shaped widgets using `label-caps` typography that hover near primary content, providing real-time data or AI-driven suggestions.
- **Selection Controls:** Checkboxes and radios should be strictly geometric. Checkboxes are squares with 4px radius; radios are concentric circles. Both use the Primary color only when active.
- **Progress Indicators:** Use ultra-thin (2px) lines with a glowing "comet" head to indicate movement or loading, maintaining the sci-fi atmosphere.