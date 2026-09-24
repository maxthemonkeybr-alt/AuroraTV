"use strict";
(function(){
var http=require("http");
var https=require("https");
var url=require("url");
var fs=require("fs");
var adbhost=require("adbhost");
var PORT=18081;
var installing=false;

function cors(res,status,type){
  res.writeHead(status,{
    "Content-Type":type||"application/json; charset=utf-8",
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Methods":"GET,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type,Range",
    "Cache-Control":"no-store"
  });
}
function fail(res,status,message){try{cors(res,status);res.end(JSON.stringify({ok:false,error:message}));}catch(e){}}

function pipeTarget(targetUrl,res,depth){
  if(depth>4)return fail(res,508,"Muitos redirecionamentos.");
  var parsed;try{parsed=url.parse(targetUrl);}catch(e){return fail(res,400,"URL inválida.");}
  if(parsed.protocol!=="http:"&&parsed.protocol!=="https:")return fail(res,400,"Protocolo não permitido.");
  if(!parsed.hostname)return fail(res,400,"Servidor inválido.");
  var lib=parsed.protocol==="https:"?https:http;
  var opts={protocol:parsed.protocol,hostname:parsed.hostname,port:parsed.port||(parsed.protocol==="https:"?443:80),path:parsed.path||"/",method:"GET",rejectUnauthorized:false,
    headers:{"User-Agent":"Mozilla/5.0 (SMART-TV; Tizen 5.0) AuroraTV/0.3.3","Accept":"application/json,text/plain,*/*","Accept-Encoding":"gzip, deflate","Connection":"close"}};
  var upstream;
  try{
    upstream=lib.request(opts,function(r){
      if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){r.resume();return pipeTarget(url.resolve(targetUrl,r.headers.location),res,depth+1);}
      var headers={"Content-Type":r.headers["content-type"]||"application/octet-stream","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"};
      if(r.headers["content-length"])headers["Content-Length"]=r.headers["content-length"];
      if(r.headers["content-encoding"])headers["Content-Encoding"]=r.headers["content-encoding"];
      if(r.headers["vary"])headers["Vary"]=r.headers["vary"];
      res.writeHead(r.statusCode||502,headers);r.pipe(res);
    });
    upstream.setTimeout(18000,function(){try{upstream.abort();}catch(e){}fail(res,504,"Tempo esgotado no servidor IPTV.");});
    upstream.on("error",function(e){fail(res,502,"Falha ao acessar o servidor IPTV: "+(e&&e.message?e.message:"erro de rede"));});
    upstream.end();
  }catch(e){fail(res,502,"Falha ao criar conexão com o servidor IPTV.");}
}

function downloadBuffer(target,cb,depth){
  depth=depth||0;if(depth>5)return cb(new Error("redirect loop"));
  var p=url.parse(target),lib=p.protocol==="https:"?https:http;
  var req=lib.request({protocol:p.protocol,hostname:p.hostname,port:p.port||(p.protocol==="https:"?443:80),path:p.path,method:"GET",rejectUnauthorized:false,headers:{"User-Agent":"AuroraTV-Native-Installer","Accept":"*/*","Connection":"close"}},function(r){
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){r.resume();return downloadBuffer(url.resolve(target,r.headers.location),cb,depth+1);}
    if(r.statusCode<200||r.statusCode>=300){r.resume();return cb(new Error("HTTP "+r.statusCode));}
    var chunks=[];r.on("data",function(c){chunks.push(c);});r.on("end",function(){cb(null,Buffer.concat(chunks));});
  });
  req.setTimeout(20000,function(){try{req.abort();}catch(e){}cb(new Error("download timeout"));});
  req.on("error",cb);req.end();
}

function shellOnce(adb,cmd,cb){
  var stream;try{stream=adb.createStream("shell:"+cmd);}catch(e){return cb(e);}
  var out="",done=false;
  function finish(err){if(done)return;done=true;cb(err,out);}
  stream.on("data",function(d){out+=d.toString();if(out.indexOf("spend time")!==-1||out.indexOf("install completed")!==-1)setTimeout(function(){finish(null);},300);});
  stream.on("error",function(e){finish(e);});
  stream.on("end",function(){finish(null);});
  stream.on("close",function(){finish(null);});
}

function installNative(res){
  if(installing){cors(res,200);return res.end(JSON.stringify({ok:false,busy:true}));}
  installing=true;
  var pkgUrl="https://raw.githubusercontent.com/maxthemonkeybr-alt/AuroraTV/main/native/AuroraTV_Native.wgt";
  var pkgPath="/home/owner/share/tmp/sdk_tools/AuroraTV_Native.wgt";
  downloadBuffer(pkgUrl,function(err,buf){
    if(err){installing=false;return fail(res,502,"Download do app nativo falhou: "+err.message);}
    try{
      if(!fs.existsSync("/home/owner/share/tmp/sdk_tools"))fs.mkdirSync("/home/owner/share/tmp/sdk_tools");
      fs.writeFileSync(pkgPath,buf);
    }catch(e){installing=false;return fail(res,500,"Falha ao salvar WGT: "+e.message);}
    var adb;
    try{adb=adbhost.createConnection({host:"127.0.0.1",port:26101});}catch(e){installing=false;return fail(res,500,"ADB local indisponível: "+e.message);}
    var timer=setTimeout(function(){installing=false;try{adb._stream.destroy();}catch(e){}fail(res,504,"ADB local não respondeu.");},15000);
    adb._stream.on("connect",function(){
      shellOnce(adb,"0 vd_appinstall aUr0raTV01.AuroraTV "+pkgPath,function(e,out){
        clearTimeout(timer);
        if(e){installing=false;return fail(res,500,"Instalação falhou: "+e.message);}
        var low=String(out||"").toLowerCase();
        var ok=low.indexOf("spend time")>=0||low.indexOf("install")>=0||low.indexOf("success")>=0;
        if(!ok&&out){installing=false;cors(res,500);return res.end(JSON.stringify({ok:false,error:"Instalação retornou erro.",output:out}));}
        shellOnce(adb,"0 was_execute aUr0raTV01.AuroraTV",function(_,launchOut){
          installing=false;cors(res,200);res.end(JSON.stringify({ok:true,installed:true,output:out,launch:launchOut||""}));
          setTimeout(function(){try{adb._stream.end();adb._stream.destroy();}catch(x){}},1000);
        });
      });
    });
    adb._stream.on("error",function(e){clearTimeout(timer);installing=false;fail(res,500,"ADB local falhou: "+e.message);});
  },0);
}

var server=http.createServer(function(req,res){
  if(req.method==="OPTIONS"){cors(res,204);return res.end();}
  var parsed=url.parse(req.url,true);
  if(parsed.pathname==="/health"){cors(res,200);return res.end(JSON.stringify({ok:true,service:"AuroraTV Proxy",version:"0.3.3",nativeInstaller:true}));}
  if(parsed.pathname==="/install-native")return installNative(res);
  if(parsed.pathname!=="/proxy")return fail(res,404,"Rota não encontrada.");
  var target=parsed.query&&parsed.query.url;if(!target)return fail(res,400,"Parâmetro url ausente.");pipeTarget(String(target),res,0);
});
server.on("error",function(e){if(e&&e.code!=="EADDRINUSE")console.log("AuroraTV proxy error: "+e.message);});
try{server.listen(PORT,"127.0.0.1",function(){console.log("AuroraTV proxy/native installer on 127.0.0.1:"+PORT);});}catch(e){}
})();