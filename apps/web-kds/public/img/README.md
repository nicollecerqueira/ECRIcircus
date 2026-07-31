# Ilustrações do ECRI Circus — web-kds

Os apps são independentes (cada um com seu `public/`), então esta pasta guarda
**só as duas artes que o quiosque da cozinha usa**. O acervo completo, com as
regras de preparo (recorte da moldura branca, 720px no maior lado, JPEG q88),
está em
[`apps/web-order/public/img/README.md`](../../../web-order/public/img/README.md).

| arquivo    | onde aparece                    |
| ---------- | ------------------------------- |
| `tent.jpg` | login                           |
| `seal.jpg` | fila vazia ("Tudo pronto")      |

São poucas de propósito: **nada pode competir com o status das comandas**. A
arte só entra no login e na fila vazia — nunca ao lado de uma ficha, onde o
verde/âmbar/vermelho do envelhecimento precisa ser lido de relance, a metros de
distância.

Os nomes vivem em `src/app/shared/components/art.tsx`. Faltando um arquivo,
nada quebra: o `<Art>` cai no emoji de reserva.
