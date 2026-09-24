(function(){
"use strict";
var C,overlay,video,stage,avObject,aspectMenu,current=null,saveTimer=null,hideTimer=null,opened=false,aspect="auto",backend="html5",nativePos=0,nativeDur=0,currentUrl="",nativeTriedFallback=false,nativeReconnects=0;

function nativeAvailable(){
  try{return !!(window.webapis&&webapis.avplay&&typeof webapis.avplay.open==="function")}catch(e){return false}
}
function init(){
  C=AuroraCore;overlay=C.byId("playerOverlay");video=C.byId("video");stage=C.byId("videoStage");avObject=C.byId("avPlayer");aspectMenu=C.byId("aspectMenu");
  C.byId("playerBack").onclick=close;C.byId("playPauseBtn").onclick=toggle;C.byId("rewindBtn").onclick=function(){seek(-10)};C.byId("forwardBtn").onclick=function(){seek(10)};
  C.byId("restartBtn").onclick=restart;C.byId("aspectBtn").onclick=toggleAspectMenu;
  Array.prototype.forEach.call(aspectMenu.querySelectorAll("[data-aspect]"),function(b){b.onclick=function(){setAspect(b.getAttribute("data-aspect"));aspectMenu.classList.add("hidden");showControls()}});
  video.addEventListener("timeupdate",updateHtml);video.addEventListener("play",updatePlayIcon);video.addEventListener("pause",updatePlayIcon);
  video.addEventListener("ended",function(){persist();showControls()});video.addEventListener("error",onHtmlError);
  document.addEventListener("mousemove",function(){if(opened)showControls()});setAspect(C.read("aspect","auto"));
}
function isOpen(){return opened}
function setupUi(item){
  current=item;opened=true;overlay.classList.remove("hidden");overlay.classList.remove("controls-hidden");aspectMenu.classList.add("hidden");
  C.byId("playerTitle").textContent=item.title||"Reprodução";C.byId("playerKind").textContent=item.type==="live"?"CANAL AO VIVO":item.type==="episode"?"EPISÓDIO":"FILME";
  C.byId("liveBadge").classList.toggle("hidden",item.type!=="live");C.byId("timeline").classList.toggle("hidden",item.type==="live");
  C.byId("currentTime").classList.toggle("hidden",item.type==="live");C.byId("durationTime").classList.toggle("hidden",item.type==="live");
  C.byId("progressBar").style.width="0%";C.byId("currentTime").textContent="00:00";C.byId("durationTime").textContent="00:00";
}
function play(item,url){
  if(!url){C.toast("Não foi possível montar o endereço deste conteúdo.");return}
  setupUi(item);clearInterval(saveTimer);nativePos=0;nativeDur=0;currentUrl=url;nativeTriedFallback=false;nativeReconnects=0;
  var p=C.getProgress(item);
  if(nativeAvailable()){backend="avplay";playNative(url,p)}else{backend="html5";playHtml(url,p)}
  saveTimer=setInterval(persist,5000);showControls();setTimeout(function(){C.byId("playPauseBtn").focus()},100);
}
function playNative(url,progress){
  currentUrl=url;video.style.display="none";avObject.style.display="block";safeNativeClose();
  try{
    webapis.avplay.open(url);
    webapis.avplay.setListener({
      onbufferingstart:function(){if(opened)C.byId("aspectLabel").textContent="Carregando..."},
      onbufferingprogress:function(percent){if(opened&&percent!=null)C.byId("aspectLabel").textContent="Carregando "+percent+"%"},
      onbufferingcomplete:function(){if(opened)updateAspectLabel()},
      oncurrentplaytime:function(ms){nativePos=Number(ms)||0;updateNative()},
      onstreamcompleted:function(){persist();showControls()},
      onerror:function(err){if(opened)handleNativeFailure(err)},
      onevent:function(){},
      onsubtitlechange:function(){},
      ondrmevent:function(){}
    });
    try{webapis.avplay.setTimeoutForBuffering(12)}catch(e){}
    try{webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY","PLAYER_BUFFER_SIZE_IN_SECOND",5)}catch(e){}
    try{webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_RESUME","PLAYER_BUFFER_SIZE_IN_SECOND",10)}catch(e){}
    applyNativeAspect();
    webapis.avplay.prepareAsync(function(){
      try{nativeDur=Number(webapis.avplay.getDuration())||0}catch(e){nativeDur=0}
      if(current&&current.type!=="live"&&progress&&progress.position>8&&progress.percent<.97){
        var ms=Math.max(100,Math.round(progress.position*1000));
        try{
          webapis.avplay.seekTo(ms,function(){try{webapis.avplay.play()}catch(e){}},function(){try{webapis.avplay.play()}catch(e){}});
          C.toast("Continuando de "+C.fmt(progress.position));
        }catch(e){try{webapis.avplay.play()}catch(x){}}
      }else{try{webapis.avplay.play()}catch(e){}}
      updatePlayIcon();updateNative();updateAspectLabel();
    },function(err){handleNativeFailure(err)});
  }catch(e){
    C.toast("AVPlay indisponível para este stream. Tentando player compatível...",3500);
    safeNativeClose();backend="html5";playHtml(url,progress);
  }
}
function handleNativeFailure(err){
  if(!opened)return;
  if(current&&current.type==="live"&&!nativeTriedFallback){
    nativeTriedFallback=true;
    var alt=currentUrl;
    if(/\.m3u8(?:\?.*)?$/i.test(alt))alt=alt.replace(/\.m3u8(\?.*)?$/i,".ts$1");
    else if(/\.ts(?:\?.*)?$/i.test(alt))alt=alt.replace(/\.ts(\?.*)?$/i,".m3u8$1");
    if(alt!==currentUrl){
      C.toast("Tentando formato alternativo do canal...",1800);
      safeNativeClose();
      setTimeout(function(){if(opened)playNative(alt,null)},180);
      return;
    }
  }
  if(current&&current.type==="live"&&nativeReconnects<2){
    nativeReconnects++;
    C.toast("Reconectando canal ("+nativeReconnects+"/2)...",1800);
    safeNativeClose();
    setTimeout(function(){if(opened)playNative(currentUrl,null)},1200);
    return;
  }
  C.toast("Não foi possível reproduzir: "+String(err||"erro de mídia"),5000);showControls();
}
function playHtml(url,progress){
  avObject.style.display="none";video.style.display="block";video.src=url;video.load();
  video.onloadedmetadata=function(){
    if(current&&current.type!=="live"&&progress&&progress.position>8&&progress.percent<.97){try{video.currentTime=Math.min(progress.position,Math.max(0,video.duration-3));C.toast("Continuando de "+C.fmt(progress.position))}catch(e){}}
    var pr=video.play();if(pr&&pr.catch)pr.catch(function(){showControls()});
  };
}
function safeNativeClose(){
  if(!nativeAvailable())return;
  try{var st=webapis.avplay.getState();if(st==="PLAYING"||st==="PAUSED"||st==="READY")webapis.avplay.stop()}catch(e){}
  try{webapis.avplay.close()}catch(e){}
}
function close(){
  if(!opened)return true;
  if(!aspectMenu.classList.contains("hidden")){aspectMenu.classList.add("hidden");C.byId("aspectBtn").focus();return true}
  persist();opened=false;clearInterval(saveTimer);clearTimeout(hideTimer);
  if(backend==="avplay")safeNativeClose();else{try{video.pause();video.removeAttribute("src");video.load()}catch(e){}}
  avObject.style.display="none";video.style.display="block";overlay.classList.add("hidden");
  if(window.AuroraApp&&AuroraApp.restoreFocus)AuroraApp.restoreFocus();return true;
}
function persist(){
  if(!current||current.type==="live")return;
  if(backend==="avplay"&&nativeAvailable()){
    var pos=0,dur=0;try{pos=(Number(webapis.avplay.getCurrentTime())||nativePos)/1000;dur=(Number(webapis.avplay.getDuration())||nativeDur)/1000}catch(e){}
    C.saveProgress(current,pos,dur);return;
  }
  C.saveProgress(current,video.currentTime||0,isFinite(video.duration)?video.duration:0);
}
function toggle(){
  if(backend==="avplay"&&nativeAvailable()){
    try{var st=webapis.avplay.getState();if(st==="PLAYING")webapis.avplay.pause();else if(st==="PAUSED"||st==="READY")webapis.avplay.play()}catch(e){}
  }else{if(video.paused){var p=video.play();if(p&&p.catch)p.catch(function(){})}else video.pause()}
  updatePlayIcon();showControls();
}
function restart(){
  if(!current||current.type==="live")return;
  if(backend==="avplay"&&nativeAvailable()){try{webapis.avplay.seekTo(100,function(){webapis.avplay.play()},function(){})}catch(e){}}
  else{try{video.currentTime=0;video.play()}catch(e){}}
  showControls();
}
function seek(n){
  if(!current||current.type==="live")return;
  if(backend==="avplay"&&nativeAvailable()){
    try{if(n>0)webapis.avplay.jumpForward(n*1000);else webapis.avplay.jumpBackward(Math.abs(n)*1000)}catch(e){}
  }else{try{video.currentTime=Math.max(0,Math.min(video.duration||1e9,video.currentTime+n))}catch(e){}}
  showControls();
}
function updateNative(){
  if(!current||current.type==="live")return;
  var d=nativeDur;try{d=Number(webapis.avplay.getDuration())||d}catch(e){}
  var p=d?Math.max(0,Math.min(100,(nativePos/d)*100)):0;
  C.byId("progressBar").style.width=p+"%";C.byId("currentTime").textContent=C.fmt(nativePos/1000);C.byId("durationTime").textContent=C.fmt(d/1000);
}
function updateHtml(){
  if(!video||current&&current.type==="live")return;var d=isFinite(video.duration)?video.duration:0,p=d?Math.max(0,Math.min(100,(video.currentTime/d)*100)):0;
  C.byId("progressBar").style.width=p+"%";C.byId("currentTime").textContent=C.fmt(video.currentTime);C.byId("durationTime").textContent=C.fmt(d);
}
function updatePlayIcon(){
  var paused=true;
  if(backend==="avplay"&&nativeAvailable()){try{paused=webapis.avplay.getState()!=="PLAYING"}catch(e){}}
  else paused=video.paused;
  C.byId("playPauseBtn").textContent=paused?"▶":"Ⅱ";
}
function showControls(){
  if(!opened)return;overlay.classList.remove("controls-hidden");clearTimeout(hideTimer);
  var playing=false;if(backend==="avplay"&&nativeAvailable()){try{playing=webapis.avplay.getState()==="PLAYING"}catch(e){}}else playing=!video.paused;
  if(playing&&aspectMenu.classList.contains("hidden"))hideTimer=setTimeout(function(){overlay.classList.add("controls-hidden")},4500);
}
function toggleAspectMenu(){
  aspectMenu.classList.toggle("hidden");showControls();
  if(!aspectMenu.classList.contains("hidden")){var b=aspectMenu.querySelector("[data-aspect='"+aspect+"']")||aspectMenu.querySelector("button");if(b)b.focus()}
}
function updateAspectLabel(){
  var labels={original:"Original",auto:"Automático",letterbox:"Letterbox",fill:"Preencher tela","16:9":"16:9","4:3":"4:3",zoom:"Zoom"};
  C.byId("aspectLabel").textContent=labels[aspect]||"Automático";
}
function applyNativeAspect(){
  if(!nativeAvailable())return;
  try{
    if(aspect==="4:3"){webapis.avplay.setDisplayRect(240,0,1440,1080);avObject.style.left="12.5%";avObject.style.width="75%"}
    else{webapis.avplay.setDisplayRect(0,0,1920,1080);avObject.style.left="0";avObject.style.width="100%"}
    var method=(aspect==="letterbox")?"PLAYER_DISPLAY_MODE_LETTER_BOX":(aspect==="fill"||aspect==="16:9"||aspect==="4:3"||aspect==="zoom")?"PLAYER_DISPLAY_MODE_FULL_SCREEN":"PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO";
    webapis.avplay.setDisplayMethod(method);
  }catch(e){}
}
function setAspect(mode){
  if(mode==="reset")mode="auto";aspect=mode||"auto";
  ["mode-auto","mode-original","mode-letterbox","mode-fill","mode-169","mode-43","mode-zoom"].forEach(function(c){stage.classList.remove(c)});
  var cls=mode==="16:9"?"mode-169":mode==="4:3"?"mode-43":"mode-"+mode;stage.classList.add(cls);C.write("aspect",mode);
  if(backend==="avplay")applyNativeAspect();updateAspectLabel();
}
function onHtmlError(){
  if(!opened||backend!=="html5")return;var code=video.error?video.error.code:0,msg=code===4?"Formato/codec não suportado pela TV ou endereço indisponível.":"Falha ao reproduzir este conteúdo.";
  C.toast(msg,4200);showControls();
}
function handleKey(e){
  if(!opened)return false;var code=e.keyCode||e.which;showControls();
  if(code===10009||code===8||e.key==="Escape")return close();
  if(code===415){if(backend==="avplay"&&nativeAvailable()){try{webapis.avplay.play()}catch(x){}}else video.play();updatePlayIcon();return true}
  if(code===19){if(backend==="avplay"&&nativeAvailable()){try{webapis.avplay.pause()}catch(x){}}else video.pause();updatePlayIcon();return true}
  if(code===413){return close()}if(code===412){seek(-10);return true}if(code===417){seek(10);return true}if(code===10252){toggle();return true}
  if(code===37){C.move("left");return true}if(code===38){C.move("up");return true}if(code===39){C.move("right");return true}if(code===40){C.move("down");return true}
  if(code===13){var el=document.activeElement;if(el&&typeof el.click==="function")el.click();return true}return false;
}
window.AuroraPlayer={init:init,play:play,close:close,isOpen:isOpen,handleKey:handleKey,setAspect:setAspect};
})();