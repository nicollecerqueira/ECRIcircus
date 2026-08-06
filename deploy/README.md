# Subir o ECRI Circus numa VM

> **Primeira vez, VM recém-criada?** Siga o [PRIMEIRA-VEZ.md](PRIMEIRA-VEZ.md) —
> ele começa em instalar o Docker e vai até o sistema no ar, com uma conferência
> a cada passo. Este arquivo aqui é a referência: como a stack é montada, backup,
> atualização e diagnóstico.

Tudo roda na VM: banco, cache, API e os três apps. **O Postgres não fica exposto
na internet** — só o proxy escuta fora (80/443). Os apps falam com o banco pela
rede interna do Docker.

```
Internet ──▶ Caddy (80/443) ──┬─▶ web-order   ─┐
                              ├─▶ web-staff   ─┼─▶ api ──┬─▶ postgres
                              └─▶ web-kds     ─┘         └─▶ redis
                                   (nginx de cada app encaminha /api e /realtime)
```

## Antes de começar

- VM com Linux e acesso SSH.
- **2 GB de RAM no mínimo.** A imagem de cada app é compilada na própria VM; com
  1 GB o build do Node é morto por falta de memória no meio.
- Docker e o plugin Compose instalados:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER   # saia e entre de novo no SSH depois disto
  docker compose version          # precisa responder v2.x
  ```
- Se for usar domínio, crie os registros **A** apontando para o IP da VM **antes**
  de subir — o certificado é pedido no primeiro acesso e falha se o DNS não
  resolver ainda:
  ```
  pedido.SEU-DOMINIO    → IP_DA_VM
  equipe.SEU-DOMINIO    → IP_DA_VM
  cozinha.SEU-DOMINIO   → IP_DA_VM
  SEU-DOMINIO           → IP_DA_VM
  ```

## Passo a passo

**1. Leve o código para a VM**

```bash
git clone <url-do-repositorio> ecricircus
cd ecricircus/deploy
```

**2. Crie o arquivo de segredos**

```bash
cp .env.example .env
openssl rand -base64 24   # cole em POSTGRES_PASSWORD
openssl rand -hex 32      # cole em JWT_ACCESS_SECRET
openssl rand -hex 32      # cole em JWT_REFRESH_SECRET  (valor DIFERENTE)
nano .env
```

Preencha também `DOMAIN` e `TLS_EMAIL`. **Sem domínio ainda?** Deixe `DOMAIN`
vazio e troque para `CADDYFILE=./Caddyfile.sem-dominio` — os apps saem por
`http://IP`, `http://IP:8081` e `http://IP:8082`. Leia o cabeçalho daquele
arquivo: sem HTTPS o app não instala no celular e a senha da equipe trafega em
texto claro. Serve para testar, não para o evento.

**3. Suba**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

A primeira vez demora (compila quatro imagens). Acompanhe com:

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

Está pronto quando aparecer `ECRI Circus API on http://localhost:3000/api/v1`.
As migrations rodam sozinhas no boot; num banco vazio, o seed cria a marca ECRI
Circus e as contas de acesso.

**4. Feche a VM para o resto do mundo**

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Se estiver usando o modo sem domínio, libere também `8081/tcp` e `8082/tcp`.
Nenhuma regra para 5432: o banco não tem porta publicada, e é assim que deve
continuar. Provedores de nuvem costumam ter um firewall próprio no painel —
ajuste lá também.

**5. Entre e troque a senha**

| Endereço | Para quem |
|---|---|
| `https://pedido.SEU-DOMINIO` | clientes do evento (é o link do cartaz/QR) |
| `https://equipe.SEU-DOMINIO` | balcão, caixa, cardápio, contas de acesso |
| `https://cozinha.SEU-DOMINIO` | painel da cozinha (TV) |

Entre como `owner@ecricircus.app` / `ecri123` e **troque a senha de todas as
contas em Contas de acesso**. A senha do seed é pública neste repositório.

## Trazer os dados que já existem na sua máquina

O seed cria um banco novo e vazio. Se quiser levar o que está no seu notebook
(cardápio ajustado, contas já abertas), copie o banco inteiro.

**A ordem importa.** O dump traz o schema INTEIRO, então ele precisa cair num
banco onde a API ainda não subiu — se a API rodar antes, ela cria as tabelas e a
restauração morre em "relation already exists". Por isso o Postgres sobe
sozinho primeiro, e o resto da stack só depois:

```bash
# 1) NO SEU COMPUTADOR — gera o arquivo
docker exec ecricircus-postgres-1 pg_dump -U ecri -d ecri > ecri-dump.sql

# 2) mande para a VM
scp ecri-dump.sql usuario@IP_DA_VM:~

# 3) NA VM — só o banco de pé, sem a API
cd ~/ecricircus/deploy
docker compose -f docker-compose.prod.yml up -d postgres
sleep 10

# 4) a role do RLS antes do dump: ela é objeto do CLUSTER, não do banco, então
#    o pg_dump NÃO a traz — mas traz os GRANTs que a mencionam. Sem criá-la,
#    a restauração termina com dois erros de "role does not exist".
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U ecri -d ecri -c "create role ecri_rls login password 'ecri_rls';"

# 5) restaura
cat ~/ecri-dump.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U ecri -d ecri

# 6) agora sim, o resto da stack
docker compose -f docker-compose.prod.yml up -d --build
```

A API sobe, vê as 14 migrations já registradas na tabela de controle e não
refaz nenhuma; o seed vê que já existem marcas e não semeia por cima.

Se já tiver usado o sistema na VM antes de restaurar, zere primeiro —
`docker compose -f docker-compose.prod.yml down -v` **apaga o volume** — e
recomece do passo 3.

## Backup

Os dados vivem no volume `ecri_ecri-pgdata`. Nada dentro da pasta do projeto —
apagar o clone do git não apaga o banco, e copiar a pasta não faz backup dele.

```bash
# backup (rode antes e depois do evento, no mínimo)
cd ~/ecricircus/deploy
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U ecri -d ecri | gzip > ~/backup-ecri-$(date +%F-%H%M).sql.gz

# restauração
gunzip -c ~/backup-ecri-2026-08-06-1200.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U ecri -d ecri
```

Guarde o arquivo **fora da VM** (baixe com `scp`). Backup que só existe na
máquina que pode morrer não é backup.

## Atualizar depois de mexer no código

```bash
cd ~/ecricircus
git pull
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
```

Só os serviços que mudaram são recriados. O banco não é tocado — o volume
sobrevive a `up`, `down` e `--build`. O único comando que apaga dados é
`down -v`.

Para reconstruir um app só (poupa memória em VM pequena):

```bash
docker compose -f docker-compose.prod.yml up -d --build web-order
```

## Quando algo não sobe

```bash
docker compose -f docker-compose.prod.yml ps          # quem está de pé
docker compose -f docker-compose.prod.yml logs api    # erro da API
docker compose -f docker-compose.prod.yml logs caddy  # erro de certificado
```

- **API reiniciando em laço** — quase sempre senha do banco. Confira se
  `POSTGRES_PASSWORD` no `.env` é a mesma com que o volume foi criado: trocar a
  senha no `.env` **não** troca a senha de um banco que já existe.
- **Certificado não sai** — o DNS ainda não resolve para o IP da VM, ou a porta
  80 está bloqueada. O Let's Encrypt precisa alcançar a VM pela 80.
- **Build morre sem mensagem** — memória. Suba um serviço por vez, ou crie swap:
  `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
- **Apps no ar mas sem dados** — veja `logs api`. Se as migrations falharam, a
  API sobe mesmo assim e todas as telas ficam vazias.

## Arquivos

- `docker-compose.prod.yml` — a stack. Nome de projeto fixo (`ecri`), para os
  volumes terem nome previsível.
- `Caddyfile` — proxy com domínio e HTTPS automático.
- `Caddyfile.sem-dominio` — proxy por porta, HTTP puro, para testar sem domínio.
- `.env.example` — modelo dos segredos. Copie para `.env` **na VM**; o `.env`
  não vai para o git.
