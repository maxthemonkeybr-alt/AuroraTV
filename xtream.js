(function(){
"use strict";
function cleanServer(v){
  v=String(v||"").trim();
  v=v.replace(/^https:\/(?!\/)/i,"https://").replace(/^http:\/(?!\/)/i,"http://");
  if(/^https:[^/]/i.test(v))v=v.replace(/^https:/i,"https://");
  if(/^http:[^/]/i.test(v))v=v.replace(/^http:/i,"http://");
  v=v.replace(/\/+$/,"");
  if(v&&!/^https?:\/\//i.test(v))v="http://"+v;
  return v;
}
function Client(server,user,pass){
  this.server=cleanServer(server);this.user=String(user||"").trim();this.pass=String(pass||"");
  this.timeout=20000;this.livePreference=AuroraCore.read("liveFormat","auto");this.liveFormat=this._resolveLiveFormat();
}
Client.prototype._resolveLiveFormat=function(){
  if(this.livePreference==="ts"||this.livePreference==="m3u8")return this.livePreference;
  try{if(window.webapis&&webapis.avplay)return"ts"}catch(e){}
  return"m3u8";
};
Client.prototype._url=function(action,extra){
  var q="username="+encodeURIComponent(this.user)+"&password="+encodeURIComponent(this.pass);
  if(action)q+="&action="+encodeURIComponent(action);
  if(extra)Object.keys(extra).forEach(function(k){if(extra[k]!==undefined&&extra[k]!==null&&extra[k]!=="")q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(extra[k])});
  return this.server+"/player_api.php?"+q;
};
Client.prototype._transportUrl=function(target){
  var h=location.hostname,p=location.port;
  if(h==="127.0.0.1"&&p==="8081")return"http://127.0.0.1:18081/proxy?url="+encodeURIComponent(target);
  if((h==="127.0.0.1"||h==="localhost")&&p==="9080")return"/proxy?url="+encodeURIComponent(target);
  return target;
};
Client.prototype._request=function(action,extra){
  var self=this;
  return new Promise(function(resolve,reject){
    var xhr=new XMLHttpRequest(),done=false,target=self._transportUrl(self._url(action,extra)),
      t=setTimeout(function(){if(done)return;done=true;try{xhr.abort()}catch(e){}reject(new Error("Tempo esgotado ao acessar o servidor IPTV."))},self.timeout);
    xhr.open("GET",target,true);
    xhr.onreadystatechange=function(){
      if(xhr.readyState!==4||done)return;done=true;clearTimeout(t);
      if(xhr.status>=200&&xhr.status<300){
        try{resolve(JSON.parse(xhr.responseText))}catch(e){reject(new Error("Resposta inválida do servidor IPTV."))}
      }else{
        var detail="";try{var er=JSON.parse(xhr.responseText);detail=er&&er.error?" "+er.error:""}catch(e){}
        reject(new Error("Servidor respondeu HTTP "+xhr.status+"."+detail));
      }
    };
    xhr.onerror=function(){if(done)return;done=true;clearTimeout(t);reject(new Error("Não foi possível conectar ao servidor IPTV. Verifique endereço, porta e conexão."))};
    try{xhr.send()}catch(e){clearTimeout(t);reject(e)}
  });
};
Client.prototype.authenticate=function(){
  var self=this;return this._request("").then(function(d){
    if(!d||!d.user_info||String(d.user_info.auth)!=="1")throw new Error("Usuário, senha ou servidor inválidos.");
    self.info=d;return d;
  });
};
Client.prototype.loadCategories=function(){
  var self=this;
  return Promise.all([
    this._request("get_live_categories"),
    this._request("get_vod_categories"),
    this._request("get_series_categories")
  ]).then(function(r){
    return{liveCategories:r[0]||[],movieCategories:r[1]||[],seriesCategories:r[2]||[],account:self.info||{}};
  });
};
Client.prototype.loadKind=function(kind,categoryId){
  var action=kind==="live"?"get_live_streams":kind==="movies"?"get_vod_streams":"get_series";
  var extra=categoryId&&categoryId!=="all"?{category_id:categoryId}:null;
  return this._request(action,extra).then(function(r){return r||[]});
};
Client.prototype.loadInitialCatalog=function(){
  var self=this;
  return this.loadCategories().then(function(base){
    var lc=base.liveCategories[0],mc=base.movieCategories[0],sc=base.seriesCategories[0];
    return Promise.all([
      self.loadKind("live",lc&&lc.category_id),
      self.loadKind("movies",mc&&mc.category_id),
      self.loadKind("series",sc&&sc.category_id)
    ]).then(function(r){
      base.live=r[0]||[];base.movies=r[1]||[];base.series=r[2]||[];
      base.initialCategoryIds={
        live:lc?String(lc.category_id):"all",
        movies:mc?String(mc.category_id):"all",
        series:sc?String(sc.category_id):"all"
      };
      return base;
    });
  });
};
Client.prototype.loadCatalog=function(){
  var self=this;
  return Promise.all([
    this._request("get_live_categories"),this._request("get_live_streams"),
    this._request("get_vod_categories"),this._request("get_vod_streams"),
    this._request("get_series_categories"),this._request("get_series")
  ]).then(function(r){
    return{liveCategories:r[0]||[],live:r[1]||[],movieCategories:r[2]||[],movies:r[3]||[],seriesCategories:r[4]||[],series:r[5]||[],account:self.info||{}};
  });
};
Client.prototype.movieInfo=function(id){return this._request("get_vod_info",{vod_id:id})};
Client.prototype.seriesInfo=function(id){return this._request("get_series_info",{series_id:id})};
Client.prototype.liveUrl=function(id){this.liveFormat=this._resolveLiveFormat();return this.server+"/live/"+encodeURIComponent(this.user)+"/"+encodeURIComponent(this.pass)+"/"+id+"."+this.liveFormat};
Client.prototype.movieUrl=function(id,ext){return this.server+"/movie/"+encodeURIComponent(this.user)+"/"+encodeURIComponent(this.pass)+"/"+id+"."+(ext||"mp4")};
Client.prototype.episodeUrl=function(id,ext){return this.server+"/series/"+encodeURIComponent(this.user)+"/"+encodeURIComponent(this.pass)+"/"+id+"."+(ext||"mp4")};
Client.prototype.setLiveFormat=function(v){this.livePreference=(v==="ts"||v==="m3u8")?v:"auto";this.liveFormat=this._resolveLiveFormat();AuroraCore.write("liveFormat",this.livePreference)};
window.AuroraXtream={Client:Client,cleanServer:cleanServer};
})();