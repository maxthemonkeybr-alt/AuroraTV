# Aurora TV

Cliente IPTV Xtream Codes otimizado para Samsung Tizen via TizenBrew.

## Aurora TV 0.3.0 — foco em desempenho e reprodução nativa

- Player **Samsung AVPlay** na TV; HTML5 fica apenas como fallback no PC.
- Canais ao vivo em modo **Automático**: prioriza **TS** no AVPlay e tenta M3U8 como alternativa.
- Reconexão automática controlada quando um canal falha.
- Buffer inicial e buffer de retomada configurados no AVPlay.
- `setDisplayRect()` e métodos nativos de exibição para evitar casos de áudio sem imagem.
- Catálogo carregado **por categoria**, evitando baixar/renderizar tudo no login.
- Apenas **6 itens por faixa** na Home e **16–18 cards por página** nas seções.
- Capas em lazy load.
- Cache em memória limitado a **3 categorias recentes por seção**.
- Objetos Xtream são reduzidos aos campos necessários; respostas brutas não ficam presas em memória.
- Favoritos e progresso usam cache local para evitar `JSON.parse(localStorage)` repetido a cada card.
- Navegação pelo controle usa cache de elementos focáveis.
- Proxy Xtream aceita **gzip/deflate** para reduzir tráfego de listas grandes.
- URL de servidor digitada como `https:/servidor` é normalizada automaticamente.
- Continuar assistindo, favoritos, busca e modos Original/Automático/Letterbox/Preencher/16:9/4:3/Zoom continuam disponíveis.

## Testes locais da 0.3.0

- Sintaxe validada em `core.js`, `xtream.js`, `player.js`, `app.js` e `service.js`.
- Smoke test estrutural e de otimização aprovado.
- Stress test: **100 trocas de seção + 8 ciclos de abertura/fechamento do player**.
- O DOM permaneceu estável em **240 nós / 15 cards** no cenário de teste.
- Heap após coleta de lixo: aproximadamente **0,82 MB**, sem crescimento persistente detectado.

## TizenBrew

Módulo: `maxthemonkeybr-alt/AuroraTV`

O login IPTV é salvo apenas no armazenamento local da TV quando a opção de salvar acesso está ativa. Credenciais não fazem parte do repositório.
