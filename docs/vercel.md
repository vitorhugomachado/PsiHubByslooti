# Deploy na Vercel com Services

## Topologia aprovada

- `api`: Fastify em `apps/api`, público em `/api` e `/api/*`.
- `web`: Vite/React em `apps/web`, público nos demais caminhos.
- Nenhum serviço exclusivamente interno e nenhum binding: a aplicação web é
  estática, e o JavaScript no navegador chama a API pública no mesmo domínio.
  A API não chama outro serviço deste projeto. Não configure `API_URL`,
  `VITE_API_URL` ou uma URL de binding manualmente.

Bindings só se aplicam a chamadas de servidor para servidor em runtime. Para
manter a API interna seria necessário adicionar um servidor intermediário ao
frontend, o que não faz parte desta configuração.

A Vercel preserva o caminho original ao encaminhar a requisição. O Fastify
registra todas as rotas sob `/api`, inclusive `/api/health`. O proxy do Vite
também preserva esse prefixo em desenvolvimento. Os caminhos antigos sem
`/api` deixam de ser endpoints da API. O fallback de SPA pertence somente ao
serviço `web`, permitindo atualizar `/pacientes` e `/portal/login` diretamente.
O service worker não transforma navegações para `/api` em HTML.
As rewrites de SPA enumeram as páginas atuais e os caminhos do portal para
preservar os arquivos estáticos e os módulos do Vite no `vercel dev`.
Ao adicionar novas páginas de primeiro nível, atualize essa lista no serviço web.

## Banco PostgreSQL

SQLite continua sendo o padrão de desenvolvimento (`npm run db:push`). Na
Vercel é necessário provisionar PostgreSQL externo e configurar `DATABASE_URL`.
Use a URL fornecida pelo seu provedor, com TLS e pool de conexões quando
disponível. Configure bancos distintos para Preview e Production.

`apps/api/prisma/schema.prisma` é a fonte dos modelos. O script
`prepare-postgres.mjs` deriva `schema.postgresql.prisma` sem duplicar a manutenção
dos modelos. O build `build:vercel` gera o Prisma Client para PostgreSQL e
verifica TypeScript. Ele **não** aplica migrações nem insere dados de exemplo.

Antes do primeiro deploy, aplique a migração inicial em um banco PostgreSQL
vazio, usando uma conexão apropriada para migrações (normalmente a conexão
direta do provedor). Na raiz, em um terminal PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://USUARIO:SENHA@HOST:5432/BANCO?sslmode=require'
npm run db:migrate:postgres -w @psigest/api
```

O comando executa `prisma migrate deploy` com o schema PostgreSQL. Não use
`db:push` de SQLite contra esse banco. Bancos existentes exigem revisão e
baseline das migrações; não execute a migração inicial indiscriminadamente.
Os dados do SQLite local não são transferidos por essa migração.

Para alterações futuras de modelos: edite o schema canônico, execute
`db:prepare:postgres`, crie e revise uma nova migração PostgreSQL usando um banco
de desenvolvimento dedicado e versione os arquivos de migração antes do deploy.

## Configuração do projeto

1. Importe este repositório em um único projeto Vercel, com Root Directory na
   raiz do repositório, onde fica `vercel.json`.
2. Use uma versão de Node compatível com Vite 8 (por exemplo Node 24).
3. Cadastre as variáveis abaixo nos ambientes desejados.
4. Aplique as migrações no banco correspondente e então faça o deploy.

| Variável | Valor e finalidade |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL usada pela API, nunca `file:...` na Vercel |
| `JWT_SECRET` | Segredo aleatório de pelo menos 32 caracteres, estável entre deploys do mesmo ambiente |

Não prefixe segredos com `VITE_`. Não é necessário definir `PORT` na Vercel;
o entrypoint respeita a porta fornecida pelo runtime. O servidor recusa segredo
de desenvolvimento em produção e SQLite quando `VERCEL=1`.

Para gerar um segredo localmente: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
Copie o resultado diretamente para as variáveis do projeto; não o versione.

## Verificação local e depois do deploy

Com `DATABASE_URL` e `JWT_SECRET` definidos no terminal:

```powershell
npm ci
npm run db:generate:postgres -w @psigest/api
npm run typecheck --workspaces --if-present
npm run test -w @psigest/api
npm run build
npx vercel dev -L --listen 3100
```

`-L` executa localmente sem vincular a uma conta. Para usar o projeto vinculado
e suas variáveis, execute `npx vercel dev`. A CLI executa os dois serviços.
Valide:

- `/api/health`: JSON com `status: ok`.
- `/api/patients` sem token: 401, não HTML da SPA.
- `/api/inexistente`: 404 da API.
- `/landing`, `/pacientes` e `/portal/login`: página React; rotas protegidas
  redirecionam para login quando não há sessão.
- Login, cadastro, sessão e cobrança com dados de teste em um banco isolado.

O teste de saúde verifica o processo HTTP, não a conectividade do banco.
O teste automatizado de rotas não grava no banco nem exige PostgreSQL ativo.
Para retornar ao desenvolvimento SQLite, remova a variável PostgreSQL do
terminal e rode `npm run db:push`, regenerando o cliente SQLite. Pare servidores
antes de trocar o cliente gerado entre bancos.

## Limites do deploy

Uploads continuam armazenados no banco, mas o máximo é 3 MiB por arquivo.
O base64 ocupa aproximadamente 4 MiB, deixando espaço para JSON dentro do
limite de 4,5 MB da Vercel. Arquivos maiores exigem upload direto a um serviço
de armazenamento; anexos antigos maiores também podem exceder o limite de
resposta ao fazer download. O servidor limita o corpo JSON a cerca de 4,4 MiB.

A configuração local não cria um banco nem uma conta Vercel. Migração em banco
real e validação do deploy dependem das variáveis configuradas no projeto.

## Validação realizada

- Build Vite/PWA e geração do cliente PostgreSQL com checagem TypeScript.
- Testes de rotas, autenticação e rejeição de configuração insegura em produção.
- `vercel dev -L --listen 3100` com CLI 64.3.1: saúde 200 JSON, rota privada
  sem token 401 JSON, rota desconhecida da API 404 JSON, páginas da SPA 200 HTML,
  ícone SVG com MIME correto e módulo Vite servido como JavaScript.
- O teste de roteamento usou URL PostgreSQL de validação sem banco ativo; não
  comprova persistência, migração ou login completo com PostgreSQL. Nenhum banco
  remoto foi alterado. O Prisma Client local foi restaurado para SQLite depois.

Referências: [Services](https://vercel.com/docs/services),
[roteamento](https://vercel.com/docs/services/routing),
[bindings](https://vercel.com/docs/services/bindings),
[Fastify](https://vercel.com/docs/frameworks/backend/fastify),
[limites](https://vercel.com/docs/functions/limitations).
