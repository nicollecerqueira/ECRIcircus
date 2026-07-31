import { useState } from 'react';

/**
 * Ilustrações em aquarela do circo (`public/img/*`).
 *
 * Cada app tem seu próprio `public/` (os apps são independentes), então o
 * web-kds carrega só as duas artes que usa. E usa poucas de propósito: no
 * quiosque da cozinha nada pode competir com o status das comandas, então
 * ornamento só aparece no login e na fila VAZIA — nunca ao lado de ficha.
 */
const ART = {
  tent: 'tent.jpg',
  seal: 'seal.jpg',
} as const;

export type ArtName = keyof typeof ART;

const SIZES = {
  sm: 'h-16',
  md: 'h-28',
  lg: 'h-40',
  xl: 'h-56',
} as const;

interface ArtProps {
  name: ArtName;
  size?: keyof typeof SIZES;
  /** Emoji mostrado enquanto a ilustração não existe (ou falha ao carregar). */
  fallback?: string;
  className?: string;
}

/**
 * As ilustrações são DECORATIVAS: `alt=""` + `aria-hidden`, porque toda tela que
 * as usa já diz em texto o que está acontecendo. Se um arquivo faltar, a imagem
 * some e entra o emoji de reserva — nunca fica ícone quebrado na tela.
 */
export function Art({ name, size = 'lg', fallback, className = '' }: ArtProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return fallback ? (
      <span aria-hidden className={`block text-5xl leading-none ${className}`}>
        {fallback}
      </span>
    ) : null;
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}img/${ART[name]}`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`circus-art inline-block w-auto max-w-full object-contain ${SIZES[size]} ${className}`}
    />
  );
}
