# Ilustrações do ECRI Circus

Aquarelas do circo usadas no app do cliente. Os arquivos precisam ter
**exatamente estes nomes** — o componente `<Art>`
(`src/app/shared/components/art.tsx`) monta os caminhos a partir deles:

| arquivo               | ilustração                     | onde aparece                                   |
| --------------------- | ------------------------------ | ---------------------------------------------- |
| `tent.jpg`            | tenda listrada com bandeirolas | herói da vitrine de delivery e da tela de scan |
| `ticket.jpg`          | ingresso "ADMIT ONE"           | topo do carrinho e pedido pronto               |
| `popcorn-bucket.jpg`  | balde de pipoca                | carrinho vazio                                 |
| `rabbit-hat.jpg`      | coelho na cartola              | cardápio vazio e QR inválido                   |
| `seal.jpg`            | foca equilibrando a bola       | pedido em preparo                              |
| `popcorn-loose.jpg`   | pipocas soltas                 | marca d'água do rodapé                         |

## Como as artes foram preparadas

As originais vinham em 1080×1350 com muita margem branca em volta (o ingresso
ocupava só 26% da tela) e somavam **3,5 MB** — inaceitável numa página que o
cliente abre no 4G depois de escanear o QR. O tratamento aplicado foi:

1. **Recorte da moldura branca** (limiar 245, 6px de folga). Sem isso a arte
   aparece pequena no meio de um quadrado vazio.
2. **Reescala para no máximo 720px** no maior lado. São exibidas a no máximo
   224px de altura, o que cobre telas de alta densidade com folga.
3. **JPEG qualidade 88.** Elas não têm canal alfa — o fundo é branco chapado —
   e o tema do app é branco (`--bg: #fffdfa`), então a emenda é imperceptível e
   o JPEG comprime muito melhor que PNG para aquarela.

Resultado: **3479 KB → 358 KB (90% menor)**.

## Ao trocar ou acrescentar uma arte

- Repita os três passos acima; um PNG de 1 MB direto da fonte derruba o
  desempenho da página no celular.
- Se a nova arte tiver **fundo transparente**, salve em PNG e troque a extensão
  no objeto `ART` do `art.tsx` — é o único lugar que conhece os nomes.
- **Faltando um arquivo, nada quebra**: o `<Art>` esconde a imagem que não
  carrega e cai no emoji de reserva.
