"use strict";
(function(){
var http=require("http");
var https=require("https");
var url=require("url");
var PORT=18081;

function cors(res,status,type){
  res.writeHead(status,{
    "Content-Type":type||"application/json; charset=utf-8",
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Methods":"GET,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type,Range",
    "Cache-Control":"no-store"
  });
}

function fail(res,status,message){
  try{cors(res,status);res.end(JSON.stringify({ok:false,error:message}));}catch(e){}
}

function pipeTarget(targetUrl,res,depth){
  if(depth>4)return fail(res,508,"Muitos redirecionamentos.");
  var parsed;
  try{parsed=url.parse(targetUrl);}catch(e){return fail(res,400,"URL inválida.");}
  if(parsed.protocol!=="http:"&&parsed.protocol!=="https:")return fail(res,400,"Protocolo não permitido.");
  if(!parsed.hostname)return fail(res,400,"Servidor inválido.");
  var lib=parsed.protocol==="https:"?https:http;
  var opts={
    protocol:parsed.protocol,
    hostname:parsed.hostname,
    port:parsed.port||(parsed.protocol==="https:"?443:80),
    path:parsed.path||"/",
    method:"GET",
    rejectUnauthorized:false,
    headers:{
      "User-Agent":"Mozilla/5.0 (SMART-TV; Tizen 5.0) AuroraTV/0.2",
      "Accept":"application/json,text/plain,*/*",
      "Accept-Encoding":"identity",
      "Connection":"close"
    }
  };
  var upstream;
  try{
    upstream=lib.request(opts,function(r){
      if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){
        r.resume();
        return pipeTarget(url.resolve(targetUrl,r.headers.location),res,depth+1);
      }
      var headers={
        "Content-Type":r.headers["content-type"]||"application/octet-stream",
        "Access-Control-Allow-Origin":"*",
        "Cache-Control":"no-store"
      };
      if(r.headers["content-length"])headers["Content-Length"]=r.headers["content-length"];
      res.writeHead(r.statusCode||502,headers);
      r.pipe(res);
    });
    upstream.setTimeout(18000,function(){try{upstream.abort();}catch(e){}fail(res,504,"Tempo esgotado no servidor IPTV.");});
    upstream.on("error",function(e){fail(res,502,"Falha ao acessar o servidor IPTV: "+(e&&e.message?e.message:"erro de rede"));});
    upstream.end();
  }catch(e){fail(res,502,"Falha ao criar conexão com o servidor IPTV.");}
}

var server=http.createServer(function(req,res){
  if(req.method==="OPTIONS"){cors(res,204);return res.end();}
  var parsed=url.parse(req.url,true);
  if(parsed.pathname==="/health"){cors(res,200);return res.end(JSON.stringify({ok:true,service:"AuroraTV Proxy",version:"0.2.0"}));}
  if(parsed.pathname!=="/proxy")return fail(res,404,"Rota não encontrada.");
  var target=parsed.query&&parsed.query.url;
  if(!target)return fail(res,400,"Parâmetro url ausente.");
  pipeTarget(String(target),res,0);
});
server.on("error",function(e){
  if(e&&e.code!=="EADDRINUSE")console.log("AuroraTV proxy error: "+e.message);
});
try{server.listen(PORT,"127.0.0.1",function(){console.log("AuroraTV proxy on 127.0.0.1:"+PORT);});}catch(e){}
})();