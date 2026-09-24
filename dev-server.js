"use strict";
var http=require("http"),fs=require("fs"),path=require("path"),url=require("url"),root=__dirname,port=Number(process.env.PORT||9080);
var mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg"};
function safePath(p){p=decodeURIComponent(p||"/").split("?")[0];if(p==="/")p="/index.html";var f=path.normalize(path.join(root,p));return f.indexOf(root)===0?f:null}
var server=http.createServer(function(req,res){var f=safePath(url.parse(req.url).pathname);if(!f){res.writeHead(403);return res.end("Forbidden")}fs.stat(f,function(err,st){if(err||!st.isFile()){res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});return res.end("Not found")}res.writeHead(200,{"Content-Type":mime[path.extname(f).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});fs.createReadStream(f).pipe(res)})});
server.listen(port,"127.0.0.1",function(){console.log("Aurora TV dev server: http://127.0.0.1:"+port)});
