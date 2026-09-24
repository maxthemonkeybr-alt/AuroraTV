# Aurora TV

Cliente IPTV Xtream Codes para Samsung Tizen via TizenBrew.

## Aurora TV 0.3.3

### Player correto para TizenBrew
- TizenBrew não expõe `webapis.avplay` para páginas de módulos.
- O Aurora agora usa **hls.js + Media Source Extensions** para canais ao vivo em M3U8.
- O servidor IPTV testado entrega playlist HLS e segmentos TS com CORS liberado.
- Streams diretos de filmes/séries continuam usando o elemento HTML5 `video`.
- O player mostra o mecanismo ativo na tela, por exemplo **HLS.js • M3U8**.
- Recuperação automática para erros de rede e mídia HLS.

### Desempenho
- Catálogo inicial por categoria, sem baixar tudo no login.
- Home com até 6 itens por faixa.
- Seções paginadas em 16–18 cards.
- Capas em lazy load.
- Cache limitado a 3 categorias recentes por seção.
- Objetos Xtream reduzidos aos campos necessários.
- Favoritos e progresso com cache local.
- Navegação por controle com cache dos elementos focáveis.
- Proxy Xtream aceita gzip/deflate.

### Testes
- Sintaxe e smoke tests aprovados.
- Stress test: 100 trocas de seção + 8 ciclos de abertura/fechamento do player sem crescimento do DOM.
- Heap após coleta de lixo: aproximadamente 0,82 MB no cenário de teste.
- Teste real do canal A&E FHD via HLS.js: vídeo 1920×1080, readyState 4, reprodução contínua sem erro.

## TizenBrew
Módulo: `maxthemonkeybr-alt/AuroraTV`

Os dados de login ficam no armazenamento local da TV após autenticação válida e não são publicados no repositório.
