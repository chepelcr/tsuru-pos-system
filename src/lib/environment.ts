const hostname = window.location.hostname.toLowerCase();
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
const environmentHostname = isLocal ? (import.meta.env.VITE_BASE_DOMAIN || "tsuru.jcampos.dev") : hostname;

export const IS_STAGING = environmentHostname === "tsuru.jcampos.dev" || environmentHostname.endsWith(".tsuru.jcampos.dev");
