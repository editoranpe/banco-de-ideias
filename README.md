# Banco de Ideias • Cloudflare Workers + D1

Aplicativo privado para registrar dores de pequenos negócios, responder perguntas guiadas, revisar um PRD e exportar um prompt para Claude Code, Codex ou Google AI Studio.

Worker: `banco-de-ideias`. Domínio existente: `bancodeideias.nascidosparaempreender.com.br`. Não modificar DNS nem adicionar outro domínio.

## O que esta versão entrega

- Interface responsiva, cadastro persistente e retomada.
- Três blocos de perguntas, registro manual de referências e quatro critérios de avaliação.
- PRD por modelo guiado, edição, versões, aprovação e exportação Markdown.
- Cloudflare Access com validação criptográfica do JWT (assinatura, emissor, audiência e validade).
- Administrador definido explicitamente por `ADMIN_EMAIL`; sócios veem suas próprias ideias e as do administrador. Edição do autor ou administrador, validada no servidor.

IA adaptativa, leitura automática de links e pesquisa de concorrentes ainda NÃO estão integradas. O aplicativo sinaliza o modo guiado. Nenhuma chave de IA é necessária nesta etapa.

## Configuração para o primeiro deploy

### 1. Banco D1

Crie um banco D1 chamado `banco-de-ideias` na sua conta Cloudflare, ou reutilize um banco dedicado já criado para este app. Copie o Database ID (UUID). Não use banco de outro aplicativo.

### 2. Build do Worker existente

Selecione o repositório `editoranpe/banco-de-ideias`, branch `main`, diretório raiz `/`.

| Campo | Valor |
|---|---|
| Comando de build | `npm run build` |
| Comando de deploy | `npm run deploy` |
| Variável de build `D1_DATABASE_ID` | UUID do banco criado no passo 1 |
| Variável de build `D1_DATABASE_NAME` | `banco-de-ideias` (opcional se usar esse nome) |

O comando de deploy gera uma configuração local, aplica migrations no D1 remoto e publica o Worker com binding `DB`. As tabelas são criadas automaticamente por esse comando. Não utilizar apenas `npx wrangler deploy`: ele não executa esta preparação. O token de build da Cloudflare precisa permitir deploy de Worker e aplicação de migrations no D1 selecionado. Não salvar tokens no GitHub.

O banco em si precisa existir antes do deploy. Se a variável estiver ausente, o comando para com uma mensagem clara sem tentar publicar com um banco incorreto.

### 3. Login e administrador

No Cloudflare Zero Trust, configure uma aplicação Access do tipo Self-hosted para `bancodeideias.nascidosparaempreender.com.br`, protegendo todo o domínio. Use uma política Allow com os e-mails autorizados. Pode usar código de acesso por e-mail ou o provedor de identidade da sua organização.

Copie o domínio da equipe e o Application Audience (AUD). Nas variáveis de execução do Worker, configure:

| Variável | Conteúdo |
|---|---|
| `ACCESS_TEAM_DOMAIN` | Domínio real da equipe, como `sua-equipe.cloudflareaccess.com` |
| `ACCESS_AUD` | Application Audience da aplicação Access |
| `ADMIN_EMAIL` | E-mail exato com o qual o administrador fará login |

Esses valores são configurações do seu ambiente e não foram inventados ou preenchidos neste repositório. O código preserva variáveis de execução com `keep_vars`. Sem configuração ou sessão válida, nenhuma API retorna dados privados. O Worker não confia em cabeçalhos de e-mail isolados.

A primeira entrada deve ser a do e-mail configurado como administrador. Depois autorize os sócios na aplicação e na política Access. O formulário interno não envia convites.

### 4. Verificação

Abra o domínio, entre pelo Access, cadastre uma ideia, recarregue a página e confirme que permanece salva. Use o exemplo, revise as respostas, monte o PRD, edite os critérios de aceitação, aprove e exporte. Teste um sócio para verificar a visibilidade. Arquivar é reversível.

## Desenvolvimento e testes

Node 22.13+ (preferencialmente versão LTS suportada pelo Vite utilizado).

```sh
npm install
npm run check
npm test
npm run build
npx wrangler deploy --dry-run --outdir /tmp/banco-worker-check
```

`npm run dev` inicia apenas o frontend de desenvolvimento. Sem backend Access e D1, as operações autenticadas não ficam disponíveis. Não há autenticação simulada na produção.

As migrations são aditivas em `migrations/`. Não editar uma migration já aplicada. Antes de uso crítico, estabelecer política de backup/recuperação do D1 e validar com contas reais.

## Migração da versão hospedada no ChatGPT

Este código não depende do login, dos cabeçalhos ou do banco da hospedagem ChatGPT. O banco da nova conta Cloudflare começa independente. Dados eventualmente cadastrados na versão anterior não são migrados automaticamente.

## Referências

- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/d1/wrangler-commands/#migrations-apply
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
