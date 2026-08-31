import esCommon from './es/common.json';
import esAuth from './es/auth.json';
import esOrganization from './es/organization.json';
import esAccess from './es/access.json';
import esCatalog from './es/catalog.json';
import esInventory from './es/inventory.json';
import esClients from './es/clients.json';
import esPos from './es/pos.json';
import esSessions from './es/sessions.json';
import esDocuments from './es/documents.json';
import esOrders from './es/orders.json';
import esAnalytics from './es/analytics.json';
import esStorefront from './es/storefront.json';
import esReports from './es/reports.json';
import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enOrganization from './en/organization.json';
import enAccess from './en/access.json';
import enCatalog from './en/catalog.json';
import enInventory from './en/inventory.json';
import enClients from './en/clients.json';
import enPos from './en/pos.json';
import enSessions from './en/sessions.json';
import enDocuments from './en/documents.json';
import enOrders from './en/orders.json';
import enAnalytics from './en/analytics.json';
import enStorefront from './en/storefront.json';
import enReports from './en/reports.json';

export const LOCALE_NAMESPACES = ["common","auth","organization","access","catalog","inventory","clients","pos","sessions","documents","orders","analytics","storefront","reports"] as const;
export type Language = 'en' | 'es';
export type TranslationDictionary = Record<string, string>;

export const esNamespaces = {
  common: esCommon,
  auth: esAuth,
  organization: esOrganization,
  access: esAccess,
  catalog: esCatalog,
  inventory: esInventory,
  clients: esClients,
  pos: esPos,
  sessions: esSessions,
  documents: esDocuments,
  orders: esOrders,
  analytics: esAnalytics,
  storefront: esStorefront,
  reports: esReports,
} as const;

export const enNamespaces = {
  common: enCommon,
  auth: enAuth,
  organization: enOrganization,
  access: enAccess,
  catalog: enCatalog,
  inventory: enInventory,
  clients: enClients,
  pos: enPos,
  sessions: enSessions,
  documents: enDocuments,
  orders: enOrders,
  analytics: enAnalytics,
  storefront: enStorefront,
  reports: enReports,
} as const;

function mergeNamespaces(namespaces: Record<string, TranslationDictionary>): TranslationDictionary {
  return Object.assign({}, ...Object.values(namespaces));
}

export const translations: Record<Language, TranslationDictionary> = {
  es: mergeNamespaces(esNamespaces),
  en: mergeNamespaces(enNamespaces),
};
