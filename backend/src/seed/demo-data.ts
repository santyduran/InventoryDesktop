/**
 * Datos de ejemplo de un taller de motos (Colombia) para pruebas locales.
 * Precios en pesos colombianos (COP), sin decimales.
 * Los proveedores son ficticios.
 */

export interface DemoCategory {
  name: string;
  description: string;
  isActive?: boolean;
}

export interface DemoProduct {
  code: string;
  name: string;
  description: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  minimumStock: number;
  isActive?: boolean;
}

export interface DemoProvider {
  businessName: string;
  nit: string;
  verificationDigit: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  observations?: string;
  isActive?: boolean;
}

export const DEMO_CATEGORIES: DemoCategory[] = [
  { name: 'Lubricantes y fluidos', description: 'Aceites de motor, líquido de frenos y lubricantes de cadena.' },
  { name: 'Frenos', description: 'Pastillas, bandas, discos y bombas de freno.' },
  { name: 'Transmisión', description: 'Kits de arrastre, cadenas y discos de clutch.' },
  { name: 'Llantas y neumáticos', description: 'Llantas delanteras, traseras y neumáticos.' },
  { name: 'Encendido y eléctrico', description: 'Bujías, baterías y componentes eléctricos.' },
  { name: 'Filtros', description: 'Filtros de aire, aceite y gasolina.' },
  { name: 'Suspensión', description: 'Amortiguadores, retenedores y aceite de suspensión.' },
  { name: 'Cables y mandos', description: 'Guayas de clutch, acelerador y velocímetro; manijas.' },
  { name: 'Iluminación', description: 'Bombillos, direccionales y exploradoras.' },
  { name: 'Accesorios de temporada', description: 'Categoría inactiva para probar filtros.', isActive: false },
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Lubricantes y fluidos
  { code: 'LUB-001', name: 'Aceite Motul 3000 20W-50 4T 1L', description: 'Aceite mineral para motor 4 tiempos', category: 'Lubricantes y fluidos', purchasePrice: 26000, salePrice: 36000, minimumStock: 12 },
  { code: 'LUB-002', name: 'Aceite Mobil Super Moto 20W-50 1L', description: 'Aceite mineral 4T para uso diario', category: 'Lubricantes y fluidos', purchasePrice: 24000, salePrice: 33000, minimumStock: 12 },
  { code: 'LUB-003', name: 'Aceite Yamalube 10W-40 semisintético 1L', description: 'Recomendado para Yamaha FZ y XTZ', category: 'Lubricantes y fluidos', purchasePrice: 32000, salePrice: 44000, minimumStock: 8 },
  { code: 'LUB-004', name: 'Aceite 2T Motul 710 1L', description: 'Aceite sintético para motores 2 tiempos', category: 'Lubricantes y fluidos', purchasePrice: 38000, salePrice: 52000, minimumStock: 4 },
  { code: 'LUB-005', name: 'Líquido de frenos DOT 4 250 ml', description: 'Para sistemas de freno hidráulico', category: 'Lubricantes y fluidos', purchasePrice: 12000, salePrice: 18000, minimumStock: 6 },
  { code: 'LUB-006', name: 'Lubricante de cadena Motul C2 400 ml', description: 'Spray para cadena de transmisión', category: 'Lubricantes y fluidos', purchasePrice: 34000, salePrice: 47000, minimumStock: 4 },

  // Frenos
  { code: 'FRE-001', name: 'Pastillas delanteras Pulsar NS 200', description: 'Juego de pastillas para freno de disco delantero', category: 'Frenos', purchasePrice: 28000, salePrice: 42000, minimumStock: 6 },
  { code: 'FRE-002', name: 'Pastillas delanteras Yamaha FZ 2.0', description: 'Juego de pastillas, compatibles con FZ 2.0 y FZ 25', category: 'Frenos', purchasePrice: 32000, salePrice: 48000, minimumStock: 6 },
  { code: 'FRE-003', name: 'Bandas freno trasero Boxer CT 100', description: 'Juego de bandas para freno de campana', category: 'Frenos', purchasePrice: 18000, salePrice: 28000, minimumStock: 6 },
  { code: 'FRE-004', name: 'Disco de freno delantero AKT NKD 125', description: 'Disco de freno de 240 mm', category: 'Frenos', purchasePrice: 85000, salePrice: 120000, minimumStock: 2 },
  { code: 'FRE-005', name: 'Bomba de freno delantera universal', description: 'Bomba con depósito, manija incluida', category: 'Frenos', purchasePrice: 65000, salePrice: 95000, minimumStock: 2 },

  // Transmisión
  { code: 'TRA-001', name: 'Kit de arrastre Boxer CT 100', description: 'Piñón, corona y cadena 428', category: 'Transmisión', purchasePrice: 95000, salePrice: 135000, minimumStock: 3 },
  { code: 'TRA-002', name: 'Kit de arrastre Pulsar 180/200', description: 'Piñón, corona y cadena 520', category: 'Transmisión', purchasePrice: 165000, salePrice: 230000, minimumStock: 2 },
  { code: 'TRA-003', name: 'Kit de arrastre Yamaha FZ 2.0', description: 'Piñón, corona y cadena 428H', category: 'Transmisión', purchasePrice: 175000, salePrice: 240000, minimumStock: 2 },
  { code: 'TRA-004', name: 'Cadena 428H x 118 eslabones', description: 'Cadena reforzada para motos de 125 a 160 cc', category: 'Transmisión', purchasePrice: 48000, salePrice: 68000, minimumStock: 3 },
  { code: 'TRA-005', name: 'Discos de clutch Honda CB 110', description: 'Juego de discos de fricción', category: 'Transmisión', purchasePrice: 55000, salePrice: 80000, minimumStock: 3 },

  // Llantas y neumáticos
  { code: 'LLA-001', name: 'Llanta trasera 90/90-18 Boxer', description: 'Uso urbano, rin 18', category: 'Llantas y neumáticos', purchasePrice: 115000, salePrice: 155000, minimumStock: 3 },
  { code: 'LLA-002', name: 'Llanta delantera 2.75-18 Boxer', description: 'Uso urbano, rin 18', category: 'Llantas y neumáticos', purchasePrice: 98000, salePrice: 135000, minimumStock: 3 },
  { code: 'LLA-003', name: 'Llanta trasera 140/70-17 FZ/Pulsar', description: 'Sin neumático (tubeless), rin 17', category: 'Llantas y neumáticos', purchasePrice: 210000, salePrice: 280000, minimumStock: 2 },
  { code: 'LLA-004', name: 'Llanta delantera 100/80-17 FZ', description: 'Sin neumático (tubeless), rin 17', category: 'Llantas y neumáticos', purchasePrice: 165000, salePrice: 220000, minimumStock: 2 },
  { code: 'LLA-005', name: 'Neumático rin 18', description: 'Tubo interior para llanta de rin 18', category: 'Llantas y neumáticos', purchasePrice: 22000, salePrice: 32000, minimumStock: 8 },

  // Encendido y eléctrico
  { code: 'ELE-001', name: 'Bujía NGK C7HSA', description: 'Para Boxer, AKT y motos de 100 a 125 cc', category: 'Encendido y eléctrico', purchasePrice: 11000, salePrice: 16000, minimumStock: 15 },
  { code: 'ELE-002', name: 'Bujía NGK CR8E', description: 'Para Yamaha FZ y XTZ', category: 'Encendido y eléctrico', purchasePrice: 22000, salePrice: 32000, minimumStock: 8 },
  { code: 'ELE-003', name: 'Batería Yuasa YTX7L-BS 12V', description: 'Batería sellada, 6 Ah', category: 'Encendido y eléctrico', purchasePrice: 145000, salePrice: 195000, minimumStock: 2 },
  { code: 'ELE-004', name: 'Batería MAC 12N5-3B 12V', description: 'Batería convencional, 5 Ah', category: 'Encendido y eléctrico', purchasePrice: 85000, salePrice: 120000, minimumStock: 3 },
  { code: 'ELE-005', name: 'Regulador rectificador Pulsar 180', description: 'Regulador de voltaje 5 cables', category: 'Encendido y eléctrico', purchasePrice: 58000, salePrice: 85000, minimumStock: 2 },

  // Filtros
  { code: 'FIL-001', name: 'Filtro de aceite Pulsar 180/200', description: 'Filtro de papel tipo cartucho', category: 'Filtros', purchasePrice: 12000, salePrice: 18000, minimumStock: 10 },
  { code: 'FIL-002', name: 'Filtro de aceite Yamaha FZ', description: 'Filtro de papel tipo cartucho', category: 'Filtros', purchasePrice: 14000, salePrice: 21000, minimumStock: 10 },
  { code: 'FIL-003', name: 'Filtro de aire Boxer CT 100', description: 'Elemento de espuma', category: 'Filtros', purchasePrice: 18000, salePrice: 27000, minimumStock: 6 },
  { code: 'FIL-004', name: 'Filtro de aire Yamaha FZ 2.0', description: 'Elemento de papel', category: 'Filtros', purchasePrice: 28000, salePrice: 40000, minimumStock: 4 },
  { code: 'FIL-005', name: 'Filtro de gasolina universal', description: 'Filtro en línea transparente', category: 'Filtros', purchasePrice: 4500, salePrice: 8000, minimumStock: 12 },

  // Suspensión
  { code: 'SUS-001', name: 'Amortiguadores traseros Boxer (par)', description: 'Par de amortiguadores de 320 mm', category: 'Suspensión', purchasePrice: 120000, salePrice: 165000, minimumStock: 2 },
  { code: 'SUS-002', name: 'Retenedores de barra 31x43', description: 'Par de retenedores para suspensión delantera', category: 'Suspensión', purchasePrice: 15000, salePrice: 25000, minimumStock: 6 },
  { code: 'SUS-003', name: 'Aceite de suspensión 10W 500 ml', description: 'Para barras telescópicas', category: 'Suspensión', purchasePrice: 22000, salePrice: 32000, minimumStock: 4 },

  // Cables y mandos
  { code: 'CAB-001', name: 'Guaya de clutch Boxer CT 100', description: 'Cable de embrague con terminales', category: 'Cables y mandos', purchasePrice: 12000, salePrice: 19000, minimumStock: 6 },
  { code: 'CAB-002', name: 'Guaya de acelerador Pulsar 180', description: 'Cable doble de acelerador', category: 'Cables y mandos', purchasePrice: 15000, salePrice: 23000, minimumStock: 5 },
  { code: 'CAB-003', name: 'Guaya de velocímetro AKT 125', description: 'Cable de velocímetro mecánico', category: 'Cables y mandos', purchasePrice: 11000, salePrice: 17000, minimumStock: 4 },
  { code: 'CAB-004', name: 'Manija de clutch universal', description: 'Manija de aluminio con soporte', category: 'Cables y mandos', purchasePrice: 18000, salePrice: 28000, minimumStock: 4 },

  // Iluminación
  { code: 'ILU-001', name: 'Bombillo farola H4 12V 35/35W', description: 'Bombillo halógeno para farola', category: 'Iluminación', purchasePrice: 9000, salePrice: 15000, minimumStock: 10 },
  { code: 'ILU-002', name: 'Bombillo stop 1157 12V', description: 'Bombillo de doble contacto para stop', category: 'Iluminación', purchasePrice: 2500, salePrice: 5000, minimumStock: 20 },
  { code: 'ILU-003', name: 'Direccionales LED universales (par)', description: 'Par de direccionales con base de caucho', category: 'Iluminación', purchasePrice: 25000, salePrice: 38000, minimumStock: 4 },
  { code: 'ILU-004', name: 'Exploradoras LED 12 W (par)', description: 'Referencia descontinuada (producto inactivo)', category: 'Iluminación', purchasePrice: 65000, salePrice: 95000, minimumStock: 2, isActive: false },
];

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    businessName: 'Distribuidora MotoRepuestos del Caribe S.A.S.',
    nit: '900123456', verificationDigit: '7',
    contactName: 'Andrea Polo', phone: '3001234567', email: 'ventas@motorepuestoscaribe.example',
    address: 'Cra 46 # 72-15', city: 'Barranquilla', state: 'Atlántico',
    observations: 'Kits de arrastre y frenos. Entrega en 48 horas.',
  },
  {
    businessName: 'Lubricantes y Filtros La 30 Ltda.',
    nit: '830456789', verificationDigit: '2',
    contactName: 'Jorge Herrera', phone: '3109876543', email: 'pedidos@lubrifiltros30.example',
    address: 'Calle 30 # 21-40', city: 'Cartagena', state: 'Bolívar',
    observations: 'Aceites y filtros. Pedido mínimo $300.000.',
  },
  {
    businessName: 'Importadora Llantas Andina S.A.S.',
    nit: '901234567', verificationDigit: '1',
    contactName: 'Paola Ríos', phone: '3204567890', email: 'comercial@llantasandina.example',
    address: 'Av. 68 # 13-20', city: 'Bogotá', state: 'Cundinamarca',
  },
  {
    businessName: 'Eléctricos Moto Center',
    nit: '1045678901', verificationDigit: '3',
    contactName: 'Luis Mendoza', phone: '3157654321', email: 'motocenter@electricos.example',
    address: 'Calle 17 # 8-55', city: 'Santa Marta', state: 'Magdalena',
    observations: 'Baterías y eléctricos. Proveedor sin factura electrónica.',
  },
  {
    businessName: 'Repuestos Industriales del Norte S.A.S.',
    nit: '890987654', verificationDigit: '5',
    contactName: 'Camila Ortiz', phone: '3016549870', email: 'cartera@repuestosnorte.example',
    address: 'Vía 40 # 85-110', city: 'Barranquilla', state: 'Atlántico',
    observations: 'Proveedor inactivo para probar filtros.', isActive: false,
  },
];

/** Productos que deben quedar por reponer al final de la simulación (stock final). */
export const DEMO_LOW_STOCK: Record<string, number> = {
  'FRE-002': 0,
  'ELE-003': 0,
  'LUB-003': 3,
  'FIL-001': 4,
  'CAB-001': 2,
  'LLA-003': 1,
  'ILU-002': 7,
};
