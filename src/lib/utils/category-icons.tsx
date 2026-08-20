// ARCHIVO GENERADO A MANO PERO CURADO: cada icono se eligio pensando en
// categorias reales de finanzas personales en Argentina, y cada uno lleva sus
// terminos de busqueda en espanol para que 'auto' encuentre `car` y 'nafta'
// encuentre `fuel`.
//
// Los 24 slugs originales siguen todos presentes: se guardan como texto en
// `finance_categories.icon`, asi que sacar uno romperia las categorias que
// ya lo tenian elegido.
import {
  Utensils, UtensilsCrossed, Coffee, Pizza, Sandwich, Salad, Beef, Fish, Apple,
  Milk, Egg, Croissant, Cake, IceCream, CupSoda, Beer, Wine, ShoppingBasket,
  Car, CarFront, Fuel, Bus, TrainFront, TramFront, Bike, Plane, Ship, Truck,
  ParkingMeter, Footprints, TrafficCone, Home, House, Lightbulb, Droplet,
  Flame, Wifi, Plug, Sofa, Bed, Bath, WashingMachine, Refrigerator, Wrench,
  Hammer, PaintRoller, Trash2, Key, Building2, HeartPulse, Pill, Stethoscope,
  Syringe, Glasses, Brain, Dumbbell, Activity, Cross, Bandage, ShoppingCart,
  ShoppingBag, Shirt, Watch, Gem, Scissors, Tag, Gift, Package, Sparkles,
  Gamepad2, Music, Headphones, Film, Tv, Popcorn, Ticket, PartyPopper, Dices,
  Guitar, Palette, Camera, BookOpen, TreePine, Briefcase, GraduationCap, Book,
  Laptop, Monitor, Printer, PenTool, FileText, Presentation, Users, Wallet,
  Banknote, Coins, CreditCard, PiggyBank, TrendingUp, TrendingDown, Landmark,
  Receipt, Calculator, HandCoins, CircleDollarSign, Percent, Scale, Repeat,
  Vault, Smartphone, Phone, Cloud, Server, HardDrive, Mail, Shield, Bell,
  Calendar, Clock, Dog, Cat, PawPrint, Bird, Baby, User, Heart, HandHeart,
  Flower2, Luggage, MapPin, Map, Compass, Tent, Hotel, Globe, Sun, PlusCircle,
  MinusCircle, Star, Zap, Boxes,
  type LucideIcon,
} from 'lucide-react'

export interface IconEntry {
  key: string
  /** Terminos de busqueda en espanol, sin acentos. */
  terms: string
}

export interface IconGroup {
  label: string
  icons: IconEntry[]
}

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Comida',
    icons: [
      { key: 'utensils', terms: 'comida restaurante almuerzo cena plato' },
      { key: 'utensils-crossed', terms: 'restaurante salida comer' },
      { key: 'coffee', terms: 'cafe desayuno bar merienda' },
      { key: 'pizza', terms: 'pizza delivery comida rapida' },
      { key: 'sandwich', terms: 'sandwich snack merienda' },
      { key: 'salad', terms: 'ensalada verduras saludable' },
      { key: 'beef', terms: 'carne carniceria asado' },
      { key: 'fish', terms: 'pescado pescaderia' },
      { key: 'apple', terms: 'fruta verduleria manzana' },
      { key: 'milk', terms: 'leche lacteos' },
      { key: 'egg', terms: 'huevos' },
      { key: 'croissant', terms: 'panaderia factura medialuna' },
      { key: 'cake', terms: 'torta cumpleanos postre' },
      { key: 'ice-cream', terms: 'helado postre' },
      { key: 'cup-soda', terms: 'bebida gaseosa' },
      { key: 'beer', terms: 'cerveza birra salida bar' },
      { key: 'wine', terms: 'vino bodega' },
      { key: 'shopping-basket', terms: 'supermercado mandados compras almacen' },
    ],
  },
  {
    label: 'Transporte',
    icons: [
      { key: 'car', terms: 'auto coche vehiculo' },
      { key: 'car-front', terms: 'auto cochera garage' },
      { key: 'fuel', terms: 'nafta combustible gasolina carga' },
      { key: 'bus', terms: 'colectivo bondi micro omnibus' },
      { key: 'train-front', terms: 'tren subte ferrocarril' },
      { key: 'tram-front', terms: 'tranvia subte' },
      { key: 'bike', terms: 'bici bicicleta' },
      { key: 'plane', terms: 'avion vuelo viaje pasaje' },
      { key: 'ship', terms: 'barco ferry crucero' },
      { key: 'truck', terms: 'camion flete mudanza envio' },
      { key: 'parking-meter', terms: 'estacionamiento parquimetro' },
      { key: 'footprints', terms: 'caminar a pie' },
      { key: 'traffic-cone', terms: 'peaje ruta obra' },
    ],
  },
  {
    label: 'Hogar',
    icons: [
      { key: 'home', terms: 'casa hogar alquiler' },
      { key: 'house', terms: 'casa vivienda propiedad' },
      { key: 'lightbulb', terms: 'luz electricidad edenor' },
      { key: 'droplet', terms: 'agua aysa' },
      { key: 'flame', terms: 'gas metrogas calefaccion' },
      { key: 'wifi', terms: 'internet wifi fibra' },
      { key: 'plug', terms: 'electricidad enchufe' },
      { key: 'sofa', terms: 'muebles living' },
      { key: 'bed', terms: 'cama dormitorio colchon' },
      { key: 'bath', terms: 'bano ducha' },
      { key: 'washing-machine', terms: 'lavarropas lavanderia' },
      { key: 'refrigerator', terms: 'heladera electrodomestico' },
      { key: 'wrench', terms: 'arreglo reparacion plomero' },
      { key: 'hammer', terms: 'obra refaccion albanil' },
      { key: 'paint-roller', terms: 'pintura pintor' },
      { key: 'trash-2', terms: 'basura expensas limpieza' },
      { key: 'key', terms: 'llave alquiler inmobiliaria' },
      { key: 'building-2', terms: 'departamento expensas consorcio' },
    ],
  },
  {
    label: 'Salud',
    icons: [
      { key: 'heart-pulse', terms: 'salud medico prepaga obra social' },
      { key: 'pill', terms: 'remedio farmacia medicamento' },
      { key: 'stethoscope', terms: 'medico consulta doctor' },
      { key: 'syringe', terms: 'vacuna inyeccion' },
      { key: 'glasses', terms: 'lentes anteojos optica' },
      { key: 'brain', terms: 'psicologo terapia salud mental' },
      { key: 'dumbbell', terms: 'gimnasio gym entrenamiento' },
      { key: 'activity', terms: 'actividad deporte' },
      { key: 'cross', terms: 'emergencia hospital' },
      { key: 'bandage', terms: 'curita herida' },
    ],
  },
  {
    label: 'Compras',
    icons: [
      { key: 'shopping-cart', terms: 'supermercado compras carrito' },
      { key: 'shopping-bag', terms: 'compras shopping tienda' },
      { key: 'shirt', terms: 'ropa remera indumentaria' },
      { key: 'watch', terms: 'reloj accesorio' },
      { key: 'gem', terms: 'joyas regalo lujo' },
      { key: 'scissors', terms: 'peluqueria corte' },
      { key: 'tag', terms: 'oferta descuento precio' },
      { key: 'gift', terms: 'regalo cumpleanos presente' },
      { key: 'package', terms: 'envio paquete correo encomienda' },
      { key: 'sparkles', terms: 'belleza cosmetica perfumeria' },
    ],
  },
  {
    label: 'Ocio',
    icons: [
      { key: 'gamepad-2', terms: 'juegos videojuegos gaming' },
      { key: 'music', terms: 'musica spotify recital' },
      { key: 'headphones', terms: 'auriculares musica podcast' },
      { key: 'film', terms: 'cine pelicula' },
      { key: 'tv', terms: 'tele streaming netflix cable' },
      { key: 'popcorn', terms: 'cine pochoclo' },
      { key: 'ticket', terms: 'entrada recital evento show' },
      { key: 'party-popper', terms: 'fiesta salida evento' },
      { key: 'dices', terms: 'juego azar apuesta' },
      { key: 'guitar', terms: 'instrumento musica clases' },
      { key: 'palette', terms: 'arte pintura hobby' },
      { key: 'camera', terms: 'fotos camara fotografia' },
      { key: 'book-open', terms: 'libro lectura' },
      { key: 'tree-pine', terms: 'parque naturaleza camping' },
    ],
  },
  {
    label: 'Trabajo y estudio',
    icons: [
      { key: 'briefcase', terms: 'trabajo empleo freelance' },
      { key: 'graduation-cap', terms: 'educacion facultad universidad estudio' },
      { key: 'book', terms: 'libro curso estudio apunte' },
      { key: 'laptop', terms: 'computadora notebook trabajo' },
      { key: 'monitor', terms: 'monitor pantalla escritorio' },
      { key: 'printer', terms: 'impresora fotocopias' },
      { key: 'pen-tool', terms: 'diseno freelance' },
      { key: 'file-text', terms: 'documento factura tramite' },
      { key: 'presentation', terms: 'curso capacitacion clase' },
      { key: 'users', terms: 'equipo socios reunion' },
    ],
  },
  {
    label: 'Finanzas',
    icons: [
      { key: 'wallet', terms: 'billetera efectivo plata' },
      { key: 'banknote', terms: 'sueldo salario billete efectivo' },
      { key: 'coins', terms: 'monedas cambio ahorro' },
      { key: 'credit-card', terms: 'tarjeta credito debito' },
      { key: 'piggy-bank', terms: 'ahorro alcancia meta' },
      { key: 'trending-up', terms: 'inversion ganancia suba' },
      { key: 'trending-down', terms: 'perdida baja' },
      { key: 'landmark', terms: 'banco entidad prestamo' },
      { key: 'receipt', terms: 'recibo factura ticket comprobante' },
      { key: 'calculator', terms: 'cuentas calculo impuestos' },
      { key: 'hand-coins', terms: 'prestamo cobro pago' },
      { key: 'circle-dollar-sign', terms: 'dolar moneda usd' },
      { key: 'percent', terms: 'interes descuento tasa' },
      { key: 'scale', terms: 'impuestos afip balance' },
      { key: 'repeat', terms: 'suscripcion recurrente mensual' },
      { key: 'vault', terms: 'caja fuerte reserva' },
    ],
  },
  {
    label: 'Servicios y tecnologia',
    icons: [
      { key: 'smartphone', terms: 'celular telefono linea' },
      { key: 'phone', terms: 'telefono llamada' },
      { key: 'cloud', terms: 'nube almacenamiento servicio' },
      { key: 'server', terms: 'hosting servidor dominio' },
      { key: 'hard-drive', terms: 'disco almacenamiento' },
      { key: 'mail', terms: 'correo mail' },
      { key: 'shield', terms: 'seguro proteccion' },
      { key: 'bell', terms: 'recordatorio aviso' },
      { key: 'calendar', terms: 'fecha mensual calendario' },
      { key: 'clock', terms: 'tiempo hora' },
    ],
  },
  {
    label: 'Personas y mascotas',
    icons: [
      { key: 'dog', terms: 'perro mascota veterinaria' },
      { key: 'cat', terms: 'gato mascota' },
      { key: 'paw-print', terms: 'mascota veterinaria alimento' },
      { key: 'bird', terms: 'pajaro mascota' },
      { key: 'baby', terms: 'bebe hijo panales' },
      { key: 'user', terms: 'persona individual' },
      { key: 'heart', terms: 'amor pareja regalo' },
      { key: 'hand-heart', terms: 'donacion caridad ayuda' },
      { key: 'flower-2', terms: 'flores regalo jardin' },
    ],
  },
  {
    label: 'Viajes',
    icons: [
      { key: 'luggage', terms: 'valija equipaje viaje' },
      { key: 'map-pin', terms: 'lugar ubicacion destino' },
      { key: 'map', terms: 'mapa viaje ruta' },
      { key: 'compass', terms: 'aventura excursion' },
      { key: 'tent', terms: 'camping carpa' },
      { key: 'hotel', terms: 'hotel alojamiento hospedaje' },
      { key: 'globe', terms: 'exterior internacional mundo' },
      { key: 'sun', terms: 'vacaciones verano playa' },
    ],
  },
  {
    label: 'Otros',
    icons: [
      { key: 'plus-circle', terms: 'otros ingresos extra varios' },
      { key: 'minus-circle', terms: 'otros gastos varios' },
      { key: 'star', terms: 'favorito importante destacado' },
      { key: 'zap', terms: 'rapido urgente energia' },
      { key: 'boxes', terms: 'varios miscelaneo otros' },
    ],
  },
]

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  'utensils': Utensils,
  'utensils-crossed': UtensilsCrossed,
  'coffee': Coffee,
  'pizza': Pizza,
  'sandwich': Sandwich,
  'salad': Salad,
  'beef': Beef,
  'fish': Fish,
  'apple': Apple,
  'milk': Milk,
  'egg': Egg,
  'croissant': Croissant,
  'cake': Cake,
  'ice-cream': IceCream,
  'cup-soda': CupSoda,
  'beer': Beer,
  'wine': Wine,
  'shopping-basket': ShoppingBasket,
  'car': Car,
  'car-front': CarFront,
  'fuel': Fuel,
  'bus': Bus,
  'train-front': TrainFront,
  'tram-front': TramFront,
  'bike': Bike,
  'plane': Plane,
  'ship': Ship,
  'truck': Truck,
  'parking-meter': ParkingMeter,
  'footprints': Footprints,
  'traffic-cone': TrafficCone,
  'home': Home,
  'house': House,
  'lightbulb': Lightbulb,
  'droplet': Droplet,
  'flame': Flame,
  'wifi': Wifi,
  'plug': Plug,
  'sofa': Sofa,
  'bed': Bed,
  'bath': Bath,
  'washing-machine': WashingMachine,
  'refrigerator': Refrigerator,
  'wrench': Wrench,
  'hammer': Hammer,
  'paint-roller': PaintRoller,
  'trash-2': Trash2,
  'key': Key,
  'building-2': Building2,
  'heart-pulse': HeartPulse,
  'pill': Pill,
  'stethoscope': Stethoscope,
  'syringe': Syringe,
  'glasses': Glasses,
  'brain': Brain,
  'dumbbell': Dumbbell,
  'activity': Activity,
  'cross': Cross,
  'bandage': Bandage,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'shirt': Shirt,
  'watch': Watch,
  'gem': Gem,
  'scissors': Scissors,
  'tag': Tag,
  'gift': Gift,
  'package': Package,
  'sparkles': Sparkles,
  'gamepad-2': Gamepad2,
  'music': Music,
  'headphones': Headphones,
  'film': Film,
  'tv': Tv,
  'popcorn': Popcorn,
  'ticket': Ticket,
  'party-popper': PartyPopper,
  'dices': Dices,
  'guitar': Guitar,
  'palette': Palette,
  'camera': Camera,
  'book-open': BookOpen,
  'tree-pine': TreePine,
  'briefcase': Briefcase,
  'graduation-cap': GraduationCap,
  'book': Book,
  'laptop': Laptop,
  'monitor': Monitor,
  'printer': Printer,
  'pen-tool': PenTool,
  'file-text': FileText,
  'presentation': Presentation,
  'users': Users,
  'wallet': Wallet,
  'banknote': Banknote,
  'coins': Coins,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'landmark': Landmark,
  'receipt': Receipt,
  'calculator': Calculator,
  'hand-coins': HandCoins,
  'circle-dollar-sign': CircleDollarSign,
  'percent': Percent,
  'scale': Scale,
  'repeat': Repeat,
  'vault': Vault,
  'smartphone': Smartphone,
  'phone': Phone,
  'cloud': Cloud,
  'server': Server,
  'hard-drive': HardDrive,
  'mail': Mail,
  'shield': Shield,
  'bell': Bell,
  'calendar': Calendar,
  'clock': Clock,
  'dog': Dog,
  'cat': Cat,
  'paw-print': PawPrint,
  'bird': Bird,
  'baby': Baby,
  'user': User,
  'heart': Heart,
  'hand-heart': HandHeart,
  'flower-2': Flower2,
  'luggage': Luggage,
  'map-pin': MapPin,
  'map': Map,
  'compass': Compass,
  'tent': Tent,
  'hotel': Hotel,
  'globe': Globe,
  'sun': Sun,
  'plus-circle': PlusCircle,
  'minus-circle': MinusCircle,
  'star': Star,
  'zap': Zap,
  'boxes': Boxes,
}

export const ICON_KEYS = Object.keys(CATEGORY_ICON_MAP)

/** Sin acentos y en minuscula, para que 'avion' matchee 'avión'. */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/**
 * Filtra los grupos por texto libre. Busca tanto en el slug del icono como en
 * sus sinonimos en espanol, y descarta los grupos que quedan vacios.
 */
export function searchIconGroups(query: string): IconGroup[] {
  const q = normalize(query)
  if (!q) return ICON_GROUPS

  return ICON_GROUPS
    .map(group => ({
      ...group,
      icons: group.icons.filter(
        icon => icon.key.includes(q) || normalize(icon.terms).includes(q)
      ),
    }))
    .filter(group => group.icons.length > 0)
}

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
