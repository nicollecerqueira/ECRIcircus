# Do zero: VM recém-criada até o sistema no ar

Passo a passo para uma VM que acabou de nascer, sem nada instalado. Siga na
ordem — cada passo termina com uma **conferência**; se ela falhar, resolva ali
antes de seguir, porque o passo seguinte depende dela.

Para o dia a dia depois de instalado (backup, atualizar, o que fazer quando algo
cai), veja o [README.md](README.md).

---

## Passo 0 — Mandar o código para o GitHub (no SEU computador)

A VM vai buscar o código do GitHub. Se o que está no seu computador não subiu
ainda, a VM baixa uma versão velha e nada do que foi feito recentemente aparece.

```bash
cd caminho/para/ECRIcircus
git status --porcelain | wc -l      # quantos arquivos estão fora do commit
```

Se o número for maior que zero:

```bash
git add -A
git commit -m "ECRI Circus: operação do evento + deploy"
git push origin main
```

**Conferência:** abra `https://github.com/SEU-USUARIO/ECRIcircus` no navegador e
veja se a pasta `deploy/` aparece lá. Se não aparecer, a VM não vai encontrá-la.

---

## Passo 1 — Entrar na VM

```bash
ssh usuario@IP_DA_VM
```

**Conferência:** `whoami` responde seu usuário, e `cat /etc/os-release` mostra a
distribuição (o passo 2 funciona em Ubuntu, Debian, Fedora e derivados).

---

## Passo 2 — Instalar o Docker (na VM)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Agora **saia e entre de novo no SSH** — sem isso o seu usuário ainda não tem
permissão de falar com o Docker:

```bash
exit
ssh usuario@IP_DA_VM
```

**Conferência:**

```bash
docker run --rm hello-world     # precisa imprimir "Hello from Docker!"
docker compose version          # precisa responder v2.x
```

Se `docker run` reclamar de permissão, o `exit`/`ssh` não foi feito.

---

## Passo 3 — Memória (na VM)

O código dos apps é compilado dentro da VM, e isso consome memória. Confira:

```bash
free -h
```

Se a linha `Mem` mostrar menos de 2 GB, crie área de troca antes de continuar —
senão o build morre no meio, sem mensagem clara:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Conferência:** `free -h` agora mostra a linha `Swap` com 2 GB.

---

## Passo 4 — Baixar o código (na VM)

```bash
git clone https://github.com/SEU-USUARIO/ECRIcircus.git
cd ECRIcircus/deploy
ls
```

Se o repositório for **privado**, o `git clone` vai pedir usuário e senha — e
senha do GitHub não funciona mais. Gere um token em
`github.com → Settings → Developer settings → Personal access tokens → Tokens
(classic)`, marque o escopo `repo`, e use o token no lugar da senha.

**Conferência:** o `ls` mostra `docker-compose.prod.yml`, `Caddyfile`,
`.env.example`. Se não mostrar, você está na pasta errada ou o passo 0 não foi
feito.

---

## Passo 5 — Criar o arquivo de segredos (na VM)

```bash
cp .env.example .env
openssl rand -base64 24      # copie o resultado → POSTGRES_PASSWORD
openssl rand -hex 32         # copie o resultado → JWT_ACCESS_SECRET
openssl rand -hex 32         # copie OUTRO resultado → JWT_REFRESH_SECRET
nano .env
```

No `nano`: edite, `Ctrl+O` e `Enter` para salvar, `Ctrl+X` para sair.

Sobre o endereço, escolha um dos dois:

- **Sem domínio (para testar agora):** deixe `DOMAIN=` vazio e troque a linha do
  Caddyfile para `CADDYFILE=./Caddyfile.sem-dominio`.
- **Com domínio:** preencha `DOMAIN=seudominio.com.br` e `TLS_EMAIL=`, mantenha
  `CADDYFILE=./Caddyfile`, e **antes de subir** crie no DNS quatro registros A
  (`pedido.`, `equipe.`, `cozinha.` e o domínio raiz) apontando para o IP da VM.

**Conferência:**

```bash
grep -c '^POSTGRES_PASSWORD=.\+' .env    # precisa responder 1
grep -c '^JWT_ACCESS_SECRET=.\+' .env    # precisa responder 1
grep -c '^JWT_REFRESH_SECRET=.\+' .env   # precisa responder 1
```

Três respostas `1`. Qualquer `0` significa campo vazio, e a stack não sobe.

---

## Passo 6 — Subir (na VM)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

A primeira vez demora bastante: quatro imagens são compiladas. É normal ficar
minutos sem saída nova.

**Conferência:**

```bash
docker compose -f docker-compose.prod.yml ps
```

Sete serviços, todos `running` (o `postgres` e o `redis` com `healthy`). Depois:

```bash
docker compose -f docker-compose.prod.yml logs api | tail -5
```

Precisa aparecer `ECRI Circus API on http://localhost:3000/api/v1`.

---

## Passo 7 — Testar de dentro da própria VM

Antes de mexer em firewall, confirme que a stack responde localmente:

```bash
curl -o /dev/null -w "cliente: %{http_code}\n" http://localhost/
curl -o /dev/null -w "equipe:  %{http_code}\n" http://localhost:8081/
curl -o /dev/null -w "cozinha: %{http_code}\n" http://localhost:8082/
```

(Com domínio configurado, troque por `https://pedido.SEU-DOMINIO` etc.)

**Conferência:** três respostas `200`. Se der `200` aqui e não abrir do seu
celular, o problema é firewall — passo 8. Se não der `200` nem aqui, é a stack —
veja `logs api`.

---

## Passo 8 — Fechar a VM para o resto do mundo

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8081/tcp     # só no modo sem domínio
sudo ufw allow 8082/tcp     # só no modo sem domínio
sudo ufw enable
```

Nenhuma regra para a porta do banco: o Postgres não tem porta publicada, e é
assim que deve continuar.

**Atenção:** provedores de nuvem (Oracle, AWS, Azure, Google) têm um **segundo
firewall no painel web**, independente do `ufw`. Se o site não abrir de fora
mesmo com o passo 7 respondendo `200`, é quase sempre lá — libere 80 e 443 nas
regras de rede do provedor.

**Conferência:** abra `http://IP_DA_VM` no celular, usando dados móveis (não o
wi-fi). Tem que carregar o cardápio.

---

## Passo 9 — Entrar e trocar as senhas

| Endereço | Para quem |
|---|---|
| `http://IP_DA_VM` (ou `https://pedido.SEU-DOMINIO`) | clientes do evento |
| `http://IP_DA_VM:8081` (ou `https://equipe.SEU-DOMINIO`) | balcão, caixa, admin |
| `http://IP_DA_VM:8082` (ou `https://cozinha.SEU-DOMINIO`) | painel da cozinha |

Entre em **equipe** como `owner@ecricircus.app` / `ecri123` e vá em **Contas de
acesso**: troque a senha de todas. A senha do seed está publicada no
repositório, então qualquer pessoa que veja o código entra no seu caixa.

---

## Passo 10 (opcional) — Trazer os dados do seu computador

Só se você quiser levar o cardápio e as contas que já existem na sua máquina.
Para começar o evento limpo, **pule este passo**. O procedimento e a ordem
correta estão no [README.md](README.md#trazer-os-dados-que-já-existem-na-sua-máquina).

---

## Se travar

| Sintoma | Causa quase sempre |
|---|---|
| `permission denied` no docker | faltou sair e entrar de novo no SSH (passo 2) |
| build morre sem erro | memória — faça o passo 3 |
| `required variable ... is missing` | campo vazio no `.env` (passo 5) |
| API reiniciando em laço | `POSTGRES_PASSWORD` diferente da que criou o volume |
| certificado não sai | DNS ainda não aponta para a VM, ou porta 80 fechada |
| responde na VM, não abre de fora | firewall do provedor, no painel web |

Os comandos de diagnóstico:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api
docker compose -f docker-compose.prod.yml logs caddy
```
