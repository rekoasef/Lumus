/**
 * Genera los íconos de la PWA a partir del orbe.
 *
 * Se deja como script y no como un "lo hice una vez a mano" para que
 * regenerarlos cuando cambie la marca sea `node scripts/generate-icons.mjs` y
 * no una tarde de recortes.
 *
 * Todos salen sobre el fondo de la app en vez de transparentes: Android e iOS
 * ponen el ícono sobre un fondo propio —blanco, casi siempre— y un orbe
 * violeta claro sobre blanco desaparece.
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public', 'lumus-orb.png')
const BACKGROUND = { r: 10, g: 10, b: 15, alpha: 1 } // #0a0a0f

/**
 * `padding` es la fracción del lienzo que queda libre alrededor del orbe.
 *
 * Para el ícono maskable importa: Android le recorta hasta el 20% de cada
 * borde según la forma del launcher, así que el contenido tiene que vivir en
 * el 60% central o se come el orbe.
 */
async function render(size, padding, output) {
  const inner = Math.round(size * (1 - padding * 2))

  const orb = await sharp(source)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: orb, gravity: 'center' }])
    .png()
    .toFile(join(root, 'public', output))

  console.log(`  ${output} — ${size}x${size}`)
}

console.log('Generando íconos de la PWA:')
await render(192, 0.08, 'icon-192.png')
await render(512, 0.08, 'icon-512.png')
// Maskable: el recorte de Android se come hasta el 20% de cada borde. El orbe
// ya trae margen propio, así que 10% acá alcanza para quedar dentro de la zona
// segura sin que el ícono se vea perdido en el medio del lienzo.
await render(512, 0.10, 'icon-maskable-512.png')
// iOS no aplica máscara ni respeta el manifest: su ícono va aparte.
await render(180, 0.10, 'apple-touch-icon.png')
console.log('Listo.')
