# Ilustrações do ECRI Circus — web-staff

Os apps são independentes (cada um com seu `public/`), então esta pasta guarda
**só as artes que o app do salão usa**. O acervo completo, com as regras de
preparo (recorte da moldura branca, 720px no maior lado, JPEG q88), está em
[`apps/web-order/public/img/README.md`](../../../web-order/public/img/README.md).

| arquivo              | onde aparece                                     |
| -------------------- | ------------------------------------------------ |
| `tent.jpg`           | login e topo da barra lateral                    |
| `rabbit-hat.jpg`     | comanda sem itens                                |
| `popcorn-bucket.jpg` | caixa sem contas em aberto                       |

Os nomes vivem em `src/app/shared/components/art.tsx`. Faltando um arquivo,
nada quebra: o `<Art>` cai no emoji de reserva.
