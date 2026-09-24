# Aurora TV
Cliente IPTV para Samsung TV com TizenBrew, desenhado para navegação por controle remoto e interface de streaming.
## Recursos implementados
- Login Xtream Codes por servidor, usuário e senha.
- Canais ao vivo, filmes, séries, categorias, busca e favoritos.
- Continuar assistindo com ponto salvo automaticamente a cada 5 segundos.
- Retomada do filme/episódio no último ponto salvo.
- Player HTML5 com Play/Pause, avançar/voltar 10s e teclas de mídia do controle.
- Formatos de imagem: Original, Automático, Letterbox, Preencher tela, 16:9, 4:3, Zoom e Reiniciar imagem.
- Preferência M3U8/TS para canais ao vivo.
- Modo demonstração para testar no PC sem credenciais reais.
## Testar no PC
1. Abra um terminal nesta pasta.
2. Rode: npm test
3. Rode: npm start
4. Abra http://127.0.0.1:9080
5. Clique em Testar interface.
## TizenBrew
O package.json já usa packageType app, appName Aurora TV e appPath index.html.
Repositório do módulo: `maxthemonkeybr-alt/AuroraTV`. No TizenBrew/TizenBrew Installer, use o repositório no formato `maxthemonkeybr-alt/AuroraTV`.
Nenhuma credencial IPTV deve ser publicada no repositório. O login é digitado e salvo apenas localmente na TV quando a opção de salvar estiver ativa.
## Compatibilidade
O projeto prioriza Tizen 5.0 e usa HTML/CSS/JavaScript sem framework. A reprodução depende dos codecs/container suportados pelo navegador da TV e pelo stream fornecido pelo servidor IPTV.
