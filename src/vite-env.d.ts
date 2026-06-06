/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION: string;
  readonly VITE_AWS_COGNITO_USER_POOL_ID: string;
  readonly VITE_AWS_COGNITO_CLIENT_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_BASE_DOMAIN: string;
  readonly VITE_TEMPLATE_NAME: string;
  readonly VITE_TEMPLATE_DISPLAY_NAME: string;
  readonly VITE_TEMPLATE_INDUSTRY: string;
  readonly VITE_SINPE_NUMBER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
