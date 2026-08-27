import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// El wrapper de Sentry solo agrega el instrumentado del build. La subida de
// source maps queda apagada mientras no haya `SENTRY_AUTH_TOKEN`: sin token no
// se sube nada y el build no falla.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Stack traces legibles en el bundle del cliente.
  widenClientFileUpload: true,
  // `disableLogger` y `automaticVercelMonitors` quedaron afuera a propósito:
  // son opciones de webpack y Next 16 buildea con Turbopack, así que lo único
  // que hacían era imprimir un warning de deprecación en cada build.
});
