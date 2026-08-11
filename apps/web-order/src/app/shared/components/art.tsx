import { useState } from 'react';

/**
 * Ilustrações em aquarela do circo (`public/img/*`).
 *
 * Único lugar que conhece os nomes dos arquivos — trocar extensão ou arte é
 * mudança de uma linha aqui. Ver `public/img/README.md`.
 */
const ART = {
  tent: 'tent.jpg',
  ticket: 'ticket.jpg',
  popcornBucket: 'popcorn-bucket.jpg',
  rabbitHat: 'rabbit-hat.jpg',
  seal: 'seal.jpg',
  popcornLoose: 'popcorn-loose.jpg',
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
 * some e entra o emoji de reserva — assim dá para subir as artes aos poucos sem
 * deixar ícone quebrado na tela.
 */
export function Art({ name, size = 'lg', fallback, className = '' }: ArtProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return fallback ? (
      <span aria-hidden className={`block text-6xl leading-none ${className}`}>
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

/** As atrações da casa, em fila — como o elenco no rodapé de um cartaz. */
const CAST: { name: ArtName; fallback: string }[] = [
  { name: 'ticket', fallback: '🎟️' },
  { name: 'popcornBucket', fallback: '🍿' },
  { name: 'seal', fallback: '🦭' },
  { name: 'rabbitHat', fallback: '🎩' },
];

/**
 * Faixa de atrações — o elenco do circo numa linha só.
 *
 * Existe porque as outras ilustrações vivem em estados que quase nunca
 * acontecem (carrinho vazio, erro de QR, pedido em preparo): sem esta faixa,
 * quem abre o app vê só a tenda e nada mais.
 */
export function Attractions({ className = '' }: { className?: string }) {
  return (
    // Sem os nomes embaixo, a faixa é 100% decorativa: vira um `div` com
    // `aria-hidden`, em vez de uma lista que o leitor de tela anunciaria como
    // "lista de 4 itens" sem ter o que ler dentro.
    <div aria-hidden className={`flex items-end justify-center gap-5 ${className}`}>
      {CAST.map((item) => (
        <Art key={item.name} name={item.name} size="sm" fallback={item.fallback} />
      ))}
    </div>
  );
}
