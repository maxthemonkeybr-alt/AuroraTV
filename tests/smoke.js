"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,".."),required=["package.json","index.html","style.css","core.js","xtream.js","mock.js","player.js","app.js","dev-server.js"],fail=[];
required.forEach(function(f){if(!fs.existsSync(path.join(root,f)))fail.push("Arquivo ausente: "+f)});
var pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));if(pkg.packageType!=="app")fail.push("packageType deve ser app");if(pkg.appPath!=="index.html")fail.push("appPath incorreto");if(pkg.appName!=="Aurora TV")fail.push("appName incorreto");
var html=fs.readFileSync(path.join(root,"index.html"),"utf8"),css=fs.readFileSync(path.join(root,"style.css"),"utf8"),app=fs.readFileSync(path.join(root,"app.js"),"utf8"),player=fs.readFileSync(path.join(root,"player.js"),"utf8");
["serverInput","mainNav","playerOverlay","aspectMenu","video"].forEach(function(x){if(html.indexOf('id="'+x+'"')<0)fail.push("Elemento ausente: "+x)});
["original","auto","letterbox","fill","16:9","4:3","zoom","reset"].forEach(function(m){if(html.indexOf('data-aspect="'+m+'"')<0)fail.push("Modo de imagem ausente: "+m)});
if(app.indexOf("seriesInfo")<0||app.indexOf("continueItems")<0)fail.push("Integração de séries/continuar assistindo incompleta");if(player.indexOf("saveProgress")<0||player.indexOf("setInterval(persist,5000)")<0)fail.push("Persistência do player incompleta");if(css.indexOf(".mode-43")<0||css.indexOf(".mode-zoom")<0)fail.push("CSS dos formatos de imagem incompleto");
if(fail.length){console.error("FALHOU\n- "+fail.join("\n- "));process.exit(1)}console.log("OK - Aurora TV passou nos testes estruturais.");
