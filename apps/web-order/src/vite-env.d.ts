/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Unidade cujo cardápio é servido e à qual os pedidos são atribuídos. */
  readonly VITE_LOCATION_ID?: string;
  /** WhatsApp que recebe o relatório do pedido (só dígitos, com DDI+DDD). */
  readonly VITE_WHATSAPP_NUMERO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
