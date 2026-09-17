import { OnboardingFlow } from '@/components/modules/onboarding/onboarding-flow'

/**
 * Onboarding: nombre, primera billetera y primer gasto.
 *
 * Hasta el 2026-09-17 pedía fecha de nacimiento, ocupación, ingreso y un texto
 * libre que no usaba nadie, y no creaba ninguna billetera: la persona terminaba
 * en un panel donde no podía cargar nada. Ahora el objetivo es uno solo, que
 * cargue su primer gasto (ver `H4` en `docs/BACKLOG.md`).
 */
export default function OnboardingPage() {
  return <OnboardingFlow />
}
