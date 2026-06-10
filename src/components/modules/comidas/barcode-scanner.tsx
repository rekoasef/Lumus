'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ScanLine, Loader2, AlertCircle, RotateCcw, ShoppingCart, UtensilsCrossed, Package } from 'lucide-react'
import type { ProductScanResult } from '@/types/food.types'

interface BarcodeScannerProps {
  onAddToList?: (product: ProductScanResult) => void
  onAddToMealLog?: (product: ProductScanResult) => void
  onClose: () => void
}

type ScanState = 'scanning' | 'loading' | 'result' | 'error'

const SCANNER_DIV_ID = 'lumus-barcode-scanner'

export function BarcodeScanner({ onAddToList, onAddToMealLog, onClose }: BarcodeScannerProps) {
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [product, setProduct] = useState<ProductScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [actionDone, setActionDone] = useState<'list' | 'meal' | null>(null)
  const scannerInstanceRef = useRef<InstanceType<typeof import('html5-qrcode')['Html5Qrcode']> | null>(null)
  const isRunning = useRef(false)

  const stopScanner = useCallback(async () => {
    if (scannerInstanceRef.current && isRunning.current) {
      try {
        await scannerInstanceRef.current.stop()
        isRunning.current = false
      } catch { /* ya detenido */ }
    }
  }, [])

  const startScanner = useCallback(async () => {
    const div = document.getElementById(SCANNER_DIV_ID)
    if (!div) return

    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
    scannerInstanceRef.current = new Html5Qrcode(SCANNER_DIV_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
      verbose: false,
    })

    try {
      await scannerInstanceRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 110 },
        },
        async (decodedText) => {
          await stopScanner()
          setScanState('loading')
          await fetchProduct(decodedText)
        },
        () => { /* frame sin barcode — silencioso */ }
      )
      isRunning.current = true
    } catch {
      setScanState('error')
      setErrorMsg('No se pudo acceder a la cámara. Verificá los permisos en el navegador.')
    }
  }, [stopScanner])

  useEffect(() => {
    startScanner()
    return () => { stopScanner() }
  }, [startScanner, stopScanner])

  async function fetchProduct(code: string) {
    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) {
        setScanState('error')
        setErrorMsg(data.error ?? 'Producto no encontrado en la base de datos')
      } else {
        setProduct(data)
        setScanState('result')
      }
    } catch {
      setScanState('error')
      setErrorMsg('Error de conexión. Intentá de nuevo.')
    }
  }

  async function handleScanAgain() {
    setProduct(null)
    setErrorMsg(null)
    setActionDone(null)
    setScanState('scanning')
    await startScanner()
  }

  function handleAddToList() {
    if (product && onAddToList) {
      onAddToList(product)
      setActionDone('list')
    }
  }

  function handleAddToMealLog() {
    if (product && onAddToMealLog) {
      onAddToMealLog(product)
      setActionDone('meal')
    }
  }

  const displayName = product?.name ?? 'Producto sin nombre'
  const hasMacros = product && (
    product.calories_per_100g !== null ||
    product.protein_per_100g !== null ||
    product.carbs_per_100g !== null ||
    product.fat_per_100g !== null
  )

  return (
    /* Pantalla completa en mobile, sheet centrada en desktop */
    <div className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-center sm:p-4">
      {/* Backdrop solo en desktop */}
      <motion.div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm sm:flex hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* Fondo sólido en mobile para que tape todo */}
      <div className="absolute inset-0 sm:hidden" style={{ background: '#0a0a0f' }} />

      <motion.div
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-w-sm sm:rounded-2xl sm:overflow-hidden"
        style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.09)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
      >
        {/* Header */}
        <div
          className="flex flex-shrink-0 items-center justify-between px-5 pt-safe-top pb-4 pt-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: 'rgba(249,115,22,0.15)' }}
            >
              <ScanLine size={16} style={{ color: '#f97316' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Escanear producto</p>
              <p className="text-[0.65rem] text-[var(--text-muted)]">
                {scanState === 'scanning' ? 'Apuntá al código de barras' :
                 scanState === 'loading' ? 'Buscando producto...' :
                 scanState === 'result' ? 'Producto encontrado' : 'Error al escanear'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors active:bg-white/15 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ESCANEANDO */}
            {scanState === 'scanning' && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                {/* Cámara — ocupa la mayor parte de la pantalla en mobile */}
                <div
                  className="relative overflow-hidden"
                  style={{ background: '#000', minHeight: 'min(60vw, 320px)' }}
                >
                  <div id={SCANNER_DIV_ID} className="w-full h-full" />

                  {/* Overlay con marco de escaneo */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {/* Oscurecimiento lateral */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="absolute inset-0"
                        style={{ background: 'rgba(0,0,0,0.45)' }}
                      />
                      {/* Ventana clara para el código */}
                      <div
                        className="relative z-10 rounded-lg"
                        style={{
                          width: 280, height: 110,
                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                          border: '2px solid rgba(249,115,22,0.6)',
                        }}
                      >
                        {/* Esquinas */}
                        {[
                          'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-md',
                          'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-md',
                          'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md',
                          'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md',
                        ].map((cls, i) => (
                          <div
                            key={i}
                            className={`absolute h-6 w-6 ${cls}`}
                            style={{ borderColor: '#f97316' }}
                          />
                        ))}
                        {/* Línea de escaneo animada */}
                        <motion.div
                          className="absolute left-1 right-1 h-0.5 rounded-full"
                          style={{ background: 'linear-gradient(90deg, transparent, #f97316, transparent)' }}
                          animate={{ top: ['8%', '88%', '8%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hint */}
                <div className="flex items-center justify-center gap-2 py-5 px-6">
                  <p className="text-center text-sm text-[var(--text-muted)]">
                    Centrá el código de barras dentro del recuadro
                  </p>
                </div>
              </motion.div>
            )}

            {/* CARGANDO */}
            {scanState === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-20 px-6"
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(249,115,22,0.12)' }}
                >
                  <Loader2 size={28} className="animate-spin" style={{ color: '#f97316' }} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-[var(--text-primary)]">Buscando producto</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Consultando la base de datos...</p>
                </div>
              </motion.div>
            )}

            {/* RESULTADO */}
            {scanState === 'result' && product && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-5 space-y-4"
              >
                {/* Tarjeta del producto */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.06)' }}
                >
                  <div className="flex items-start gap-4 p-4">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={displayName}
                        className="h-16 w-16 flex-shrink-0 rounded-xl object-contain"
                        style={{ background: '#1a1a24' }}
                      />
                    ) : (
                      <div
                        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: '#1a1a24' }}
                      >
                        <Package size={24} className="text-[var(--text-muted)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text-primary)] leading-snug">{displayName}</p>
                      {product.brand && (
                        <p className="mt-0.5 text-sm text-[var(--text-muted)]">{product.brand}</p>
                      )}
                      {product.quantity && (
                        <span
                          className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
                          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}
                        >
                          {product.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Macros grid */}
                  {hasMacros && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="px-4 pt-3 pb-2 text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Por 100g
                      </p>
                      <div className="grid grid-cols-4 gap-px px-4 pb-4">
                        {[
                          { label: 'Calorías', value: product.calories_per_100g, unit: 'kcal', color: '#f97316' },
                          { label: 'Proteína', value: product.protein_per_100g, unit: 'g', color: '#7c6dfa' },
                          { label: 'Carbos', value: product.carbs_per_100g, unit: 'g', color: '#3b82f6' },
                          { label: 'Grasa', value: product.fat_per_100g, unit: 'g', color: '#f59e0b' },
                        ].map(({ label, value, unit, color }) => (
                          <div
                            key={label}
                            className="flex flex-col items-center rounded-xl py-2.5 px-1"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          >
                            <span className="text-base font-bold tabular-nums" style={{ color }}>
                              {value !== null ? Math.round(value) : '—'}
                            </span>
                            <span className="mt-0.5 text-[0.55rem] text-[var(--text-muted)]">{unit}</span>
                            <span className="text-[0.55rem] text-[var(--text-muted)] opacity-60 text-center leading-tight mt-0.5">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasMacros && (
                    <p className="px-4 pb-3 text-xs text-[var(--text-muted)] italic">
                      Sin datos nutricionales disponibles
                    </p>
                  )}
                </div>

                {/* Feedback de acción */}
                <AnimatePresence>
                  {actionDone && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2 rounded-xl py-3"
                      style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                    >
                      <span className="text-sm font-medium" style={{ color: '#22c55e' }}>
                        {actionDone === 'list' ? '✓ Agregado a la lista del súper' : '✓ Datos cargados en el formulario'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Acciones — botones grandes para touch */}
                <div className="space-y-2.5">
                  {onAddToList && (
                    <button
                      onClick={handleAddToList}
                      disabled={actionDone === 'list'}
                      className="flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                      style={{ background: 'rgba(249,115,22,0.18)', color: '#f97316', border: '1px solid rgba(249,115,22,0.35)' }}
                    >
                      <ShoppingCart size={17} />
                      Agregar a la lista del súper
                    </button>
                  )}
                  {onAddToMealLog && (
                    <button
                      onClick={handleAddToMealLog}
                      disabled={actionDone === 'meal'}
                      className="flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                      style={{ background: 'rgba(124,109,250,0.18)', color: '#7c6dfa', border: '1px solid rgba(124,109,250,0.35)' }}
                    >
                      <UtensilsCrossed size={17} />
                      Registrar en comidas de hoy
                    </button>
                  )}
                  <button
                    onClick={handleScanAgain}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm text-[var(--text-muted)] transition-colors active:bg-white/10 hover:bg-white/5"
                  >
                    <RotateCcw size={15} />
                    Escanear otro producto
                  </button>
                </div>
              </motion.div>
            )}

            {/* ERROR */}
            {scanState === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 px-6 py-14 text-center"
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(239,68,68,0.12)' }}
                >
                  <AlertCircle size={28} style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">No encontrado</p>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">{errorMsg}</p>
                </div>
                <button
                  onClick={handleScanAgain}
                  className="mt-2 flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-medium transition-colors active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <RotateCcw size={15} />
                  Intentar de nuevo
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
