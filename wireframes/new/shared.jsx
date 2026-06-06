/* Shared — icons, data models, formatters, and shared UI building blocks */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ============ Icons (lucide-style stroke) ============ */
const Icon = ({ name, size = 18, strokeWidth = 2, className, style }) => {
  const S = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", className, style, "aria-hidden": "true" };
  const P = {
    // nav
    menu: <><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></>,
    close: <path d="M18 6L6 18M6 6l12 12"/>,
    check: <polyline points="20 6 9 17 4 12"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    chevronsLeft: <><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></>,
    chevronsRight: <><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    moreV: <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>,
    // status / sync
    wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
    wifiOff: <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    alert: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    alertTri: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    checkCircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    xCircle: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    // payments
    cash: <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
    smartphone: <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    // objects
    bag: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
    cart: <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
    package: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    // people / roles
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    userPlus: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    // data
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></>,
    trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    pie: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    // time / calendar
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    // actions
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    sort: <><polyline points="3 6 21 6"/><polyline points="7 12 17 12"/><polyline points="10 18 14 18"/></>,
    sortDesc: <><path d="M3 6h18M6 12h12M10 18h4"/><path d="M21 9l-3-3-3 3M18 6v12"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    print: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    // misc
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    unlock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>,
    logOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    logIn: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></>,
    store: <><path d="M3 9l1-4h16l1 4M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M9 21v-6h6v6"/></>,
    mapPin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    // theme
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    sliders: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
    sparkles: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></>,
    // product category icons (fallback when no image)
    burger: <><circle cx="12" cy="12" r="10"/><path d="M7 11h10M7 13h10M7 15h10"/></>,
    drink: <><path d="M6 4h12l-1 16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><line x1="6" y1="9" x2="18" y2="9"/></>,
  };
  return <svg {...S}>{P[name] || P.box}</svg>;
};

/* ============ Formatters ============ */
const fmt = (n) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");
const fmtK = (n) => { const v = Number(n) || 0; return v >= 1000 ? "₡" + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : fmt(v); };
const fmtNum = (n) => Number(n || 0).toLocaleString("es-CR");
const fmtTime = (d) => { const x = new Date(d); return x.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }); };
const fmtAgo = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "hace " + Math.floor(diff) + "s";
  if (diff < 3600) return "hace " + Math.floor(diff / 60) + " min";
  if (diff < 86400) return "hace " + Math.floor(diff / 3600) + " h";
  return Math.floor(diff / 86400) + "d";
};

/* ============ Data (matches dashboard Product/Category models) ============ */
const CATEGORIES = [
  { categoryId: "cat-food", name: "Comida", slug: "comida", description: "Platos principales y snacks", backgroundColor: "#E8620A", buttonColor: "#C4500A", isActive: true, sortOrder: 1, icon: "burger" },
  { categoryId: "cat-drinks", name: "Bebidas", slug: "bebidas", description: "Gaseosas, frescos naturales y agua", backgroundColor: "#3498DB", buttonColor: "#2980B9", isActive: true, sortOrder: 2, icon: "drink" },
];

const PRODUCTS = [
  { id: "p1", productId: "p1", name: "Hamburguesa", description: "Hamburguesa con queso, lechuga y tomate", price: 2500, categoryId: "cat-food", category: { categoryId: "cat-food", name: "Comida" }, imageUrl: null, emoji: "🍔", isActive: true, sku: "HAM-001", stockQuantity: 12, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-10T10:00:00Z", updatedAt: "2026-04-10T14:20:00Z" },
  { id: "p2", productId: "p2", name: "Empanada", description: "Empanada de carne o pollo, fritas en el momento", price: 1200, categoryId: "cat-food", category: { categoryId: "cat-food", name: "Comida" }, imageUrl: null, emoji: "🥟", isActive: true, sku: "EMP-001", stockQuantity: 20, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-10T10:02:00Z", updatedAt: "2026-04-12T09:00:00Z" },
  { id: "p3", productId: "p3", name: "Platanitos", description: "Bolsa de platanitos caseros, crujientes y salados", price: 800, categoryId: "cat-food", category: { categoryId: "cat-food", name: "Comida" }, imageUrl: null, emoji: "🍟", isActive: true, sku: "PLT-001", stockQuantity: 3, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-12T10:00:00Z", updatedAt: "2026-04-11T18:00:00Z" },
  { id: "p4", productId: "p4", name: "Cantón", description: "Empanada grande tipo cantonesa, rellena de pollo", price: 1800, categoryId: "cat-food", category: { categoryId: "cat-food", name: "Comida" }, imageUrl: null, emoji: "🌮", isActive: true, sku: "CAN-001", stockQuantity: 8, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-15T10:00:00Z", updatedAt: "2026-04-09T11:00:00Z" },
  { id: "p5", productId: "p5", name: "Coca Cola", description: "Coca Cola 355ml en lata", price: 1000, categoryId: "cat-drinks", category: { categoryId: "cat-drinks", name: "Bebidas" }, imageUrl: null, emoji: "🥤", isActive: true, sku: "BEB-COC", stockQuantity: 15, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-10T10:04:00Z", updatedAt: "2026-04-12T12:00:00Z" },
  { id: "p6", productId: "p6", name: "Fanta Colita", description: "Fanta roja 355ml en lata", price: 1000, categoryId: "cat-drinks", category: { categoryId: "cat-drinks", name: "Bebidas" }, imageUrl: null, emoji: "🧃", isActive: true, sku: "BEB-FAN", stockQuantity: 10, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-10T10:05:00Z", updatedAt: "2026-04-11T10:00:00Z" },
  { id: "p7", productId: "p7", name: "Agua", description: "Botella de agua 500ml", price: 600, categoryId: "cat-drinks", category: { categoryId: "cat-drinks", name: "Bebidas" }, imageUrl: null, emoji: "💧", isActive: false, sku: "BEB-AGU", stockQuantity: 0, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-10T10:06:00Z", updatedAt: "2026-04-12T16:00:00Z" },
  { id: "p8", productId: "p8", name: "Fresco Natural", description: "Fresco natural del día, varía según disponibilidad", price: 900, categoryId: "cat-drinks", category: { categoryId: "cat-drinks", name: "Bebidas" }, imageUrl: null, emoji: "🍹", isActive: true, sku: "BEB-FRE", stockQuantity: 6, lowStockThreshold: 5, trackInventory: true, createdAt: "2026-03-18T10:00:00Z", updatedAt: "2026-04-10T17:00:00Z" },
];

const PUESTOS = [
  { id: "pst-1", name: "Puesto 1", location: "Gradas sur", sucursal: "estadio" },
  { id: "pst-2", name: "Puesto 2", location: "Palcos", sucursal: "estadio" },
  { id: "pst-3", name: "Caja Restaurante", location: "Puntarenas centro", sucursal: "restaurante" },
];

const CAJEROS = [
  { id: "u1", firstName: "Carlos", lastName: "Mora", email: "carlos@pollos.cr", role: "cajero" },
  { id: "u2", firstName: "María", lastName: "Quesada", email: "maria@pollos.cr", role: "cajero" },
  { id: "u3", firstName: "Diego", lastName: "Vargas", email: "diego@pollos.cr", role: "cajero" },
  { id: "u4", firstName: "Ana", lastName: "Jiménez", email: "ana@pollos.cr", role: "cajero" },
];

const SESION_ACTIVA = {
  id: "ses-001",
  type: "partido",
  name: "vs Alajuelense",
  rival: "Alajuelense",
  date: "2026-04-12",
  startTime: "19:00",
  status: "en_vivo",
  sucursal: "Estadio 'Lito' Pérez",
};

const ASIGNACION = {
  id: "asgn-001",
  userId: "u1",
  userName: "Carlos M.",
  puestoId: "pst-1",
  puestoName: "Puesto 1",
  contexto: "gradas",
  sesionId: "ses-001",
};

/* ============ Shared components ============ */

// Logo — wordmark + chicken glyph
const Logo = ({ size = 32, showWord = true, theme = "auto" }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: Math.round(size * 0.52), letterSpacing: 0.5, flexShrink: 0 }}>
      PP
    </div>
    {showWord && (
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, letterSpacing: 1, textTransform: "uppercase", color: "hsl(var(--foreground))" }}>Pollos Porteños</span>
        <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", letterSpacing: 1, textTransform: "uppercase", marginTop: 2, fontFamily: "var(--font-display)", fontWeight: 600 }}>Punto de venta</span>
      </div>
    )}
  </div>
);

// Card (shadcn-style) — layout primitive
const Card = ({ children, className = "", style, hoverable, onClick, as: Tag = "div", ...rest }) => (
  <Tag className={`card ${hoverable ? "card-hover" : ""} ${className}`} style={style} onClick={onClick} {...rest}>{children}</Tag>
);
const CardHeader = ({ children, className = "", style }) => <div className={className} style={{ padding: "20px 24px 0", ...style }}>{children}</div>;
const CardBody = ({ children, className = "", style }) => <div className={className} style={{ padding: 24, ...style }}>{children}</div>;
const CardFooter = ({ children, className = "", style }) => <div className={className} style={{ padding: "16px 24px", borderTop: "1px solid hsl(var(--border))", ...style }}>{children}</div>;
const CardTitle = ({ children, className = "", style }) => <h3 className={`t-h4 ${className}`} style={{ marginBottom: 4, ...style }}>{children}</h3>;
const CardDescription = ({ children, className = "", style }) => <p className={`t-sm ${className}`} style={{ color: "hsl(var(--muted-foreground))", ...style }}>{children}</p>;

// Badge component
const Badge = ({ variant = "secondary", children, className = "", style }) => (
  <span className={`badge badge-${variant} ${className}`} style={style}>{children}</span>
);

// Button
const Button = ({ variant = "primary", size = "md", icon, iconRight, children, className = "", style, ...rest }) => {
  const sz = size === "md" ? "" : `btn-${size}`;
  const iconOnly = icon && !children && !iconRight;
  return (
    <button className={`btn btn-${variant} ${sz} ${iconOnly ? "btn-icon" : ""} ${className}`} style={style} {...rest}>
      {icon && <Icon name={icon} size={size === "xs" ? 14 : size === "sm" ? 15 : size === "lg" ? 18 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "xs" ? 14 : size === "sm" ? 15 : 16} />}
    </button>
  );
};

// Sync-status pill
const SyncPill = ({ state = "online" }) => {
  const map = {
    online: { variant: "success", icon: "wifi", label: "En línea" },
    offline: { variant: "warning", icon: "wifiOff", label: "Offline" },
    syncing: { variant: "info", icon: "refresh", label: "Sincronizando" },
  };
  const m = map[state] || map.online;
  return <Badge variant={m.variant} style={{ gap: 6 }}><Icon name={m.icon} size={11} strokeWidth={2.4} />{m.label}</Badge>;
};

// Empty state
const EmptyState = ({ icon = "package", title, description, action }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
    <div className="icon-pill icon-pill-lg icon-pill-muted" style={{ marginBottom: 16, width: 64, height: 64 }}>
      <Icon name={icon} size={28} strokeWidth={1.5} />
    </div>
    <h3 className="t-h3" style={{ marginBottom: 6 }}>{title}</h3>
    {description && <p className="t-sm" style={{ color: "hsl(var(--muted-foreground))", maxWidth: 360, marginBottom: 20 }}>{description}</p>}
    {action}
  </div>
);

// Persisted state hook
const usePersistedState = (key, initial) => {
  const [v, set] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, set];
};

// Expose
Object.assign(window, {
  Icon, Logo, Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription,
  Badge, Button, SyncPill, EmptyState, usePersistedState,
  fmt, fmtK, fmtNum, fmtTime, fmtAgo,
  PRODUCTS, CATEGORIES, PUESTOS, CAJEROS, SESION_ACTIVA, ASIGNACION,
});
