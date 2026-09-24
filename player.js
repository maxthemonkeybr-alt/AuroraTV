(function(){
"use strict";
var C,overlay,video,stage,aspectMenu,current=null,saveTimer=null,hideTimer=null,opened=false,aspect="auto",backend="html5",hls=null,hlsRecoveries=0,lastUrl="";

function init(){
  C=AuroraCore;overlay=C.byId("playerOverlay");video=C.byId("video");stage=C.byId("videoStage");aspectMenu=C.byId("aspectMenu");
  C.byId("playerBack").onclick=close;C.byId("playPauseBtn").onclick=toggle;
  C.byId("rewindBtn").onclick=function(){seek(-10)};C.byId("forwardBtn").onclick=function(){seek(10)};
  C.byId("restartBtn").onclick=restart;C.byId("aspectBtn").onclick=toggleAspectMenu;
  Array.prototype.forEach.call(aspectMenu.querySelectorAll("[data-aspect]"),function(b){b.onclick=function(){setAspect(b.getAttribute("data-aspect"));aspectMenu.classList.add("hidden");showControls()}});
  video.addEventListener("timeupdate",update);
  video.addEventListener("play",updatePlayIcon);
  video.addEventListener("pause",updatePlayIcon);
  video.addEventListener("waiting",function(){if(opened)C.byId("aspectLabel").textContent="Carregando..."});
  video.addEventListener("playing",function(){if(opened)updateAspectLabel()});
  video.addEventListener("ended",function(){persist();showControls()});
  video.addEventListener("error",onVideoError);
  document.addEventListener("mousemove",function(){if(opened)showControls()});
  setAspect(C.read("aspect","auto"));
}
function isOpen(){return opened}
function setEngineLabel(v){var e=C.byId("engineLabel");if(e)e.textContent=v||""}
function setupUi(item){
  current=item;opened=true;overlay.classList.remove("hidden");overlay.classList.remove("controls-hidden");aspectMenu.classList.add("hidden");
  C.byId("playerTitle").textContent=item.title||"Reprodução";
  C.byId("playerKind").textContent=item.type==="live"?"CANAL AO VIVO":item.type==="episode"?"EPISÓDIO":"FILME";
  C.byId("liveBadge").classList.toggle("hidden",item.type!=="live");
  C.byId("timeline").classList.toggle("hidden",item.type==="live");
  C.byId("currentTime").classList.toggle("hidden",item.type==="live");
  C.byId("durationTime").classList.toggle("hidden",item.type==="live");
  C.byId("progressBar").style.width="0%";C.byId("currentTime").textContent="00:00";C.byId("durationTime").textContent="00:00";
}
function destroyHls(){
  if(hls){try{hls.stopLoad()}catch(e){}try{hls.detachMedia()}catch(e){}try{hls.destroy()}catch(e){}hls=null}
}
function normalizeLiveUrl(url){
  if(current&&current.type==="live"&&/\.ts(?:\?.*)?$/i.test(url))return url.replace(/\.ts(\?.*)?$/i,".m3u8$1");
  return url;
}
function play(item,url){
  if(!url){C.toast("Não foi possível montar o endereço deste conteúdo.");return}
  setupUi(item);clearInterval(saveTimer);destroyHls();hlsRecoveries=0;lastUrl=normalizeLiveUrl(url);
  var p=C.getProgress(item);
  if(item.type==="live"&&/\.m3u8(?:\?|$)/i.test(lastUrl)){playHls(lastUrl)}
  else playDirect(lastUrl,p);
  saveTimer=setInterval(persist,5000);showControls();setTimeout(function(){C.byId("playPauseBtn").focus()},100);
}
function playHls(url){
  destroyHls();backend="hlsjs";video.style.display="block";video.removeAttribute("src");video.load();
  if(window.Hls&&Hls.isSupported()){
    setEngineLabel("HLS.js • M3U8");
    try{
      hls=new Hls({
        enableWorker:true,
        lowLatencyMode:false,
        backBufferLength:18,
        maxBufferLength:24,
        maxMaxBufferLength:36,
        maxBufferSize:31457280,
        liveSyncDurationCount:2,
        liveMaxLatencyDurationCount:5,
        startFragPrefetch:true
      });
      hls.on(Hls.Events.MEDIA_ATTACHED,function(){if(hls)hls.loadSource(url)});
      hls.on(Hls.Events.MANIFEST_PARSED,function(){safePlay()});
      hls.on(Hls.Events.ERROR,function(evt,data){
        if(!opened||!data)return;
        if(!data.fatal)return;
        if(data.type===Hls.ErrorTypes.NETWORK_ERROR&&hlsRecoveries<2){
          hlsRecoveries++;C.toast("Reconectando transmissão ("+hlsRecoveries+"/2)...",1800);
          try{hls.startLoad()}catch(e){}return;
        }
        if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&hlsRecoveries<2){
          hlsRecoveries++;C.toast("Recuperando vídeo ("+hlsRecoveries+"/2)...",1800);
          try{hls.recoverMediaError()}catch(e){}return;
        }
        C.toast("Falha HLS: "+(data.details||"transmissão incompatível"),5000);showControls();
      });
      hls.attachMedia(video);
      return;
    }catch(e){destroyHls()}
  }
  if(video.canPlayType&&video.canPlayType("application/vnd.apple.mpegurl")){
    backend="native-hls";setEngineLabel("HLS nativo • M3U8");
    video.src=url;video.onloadedmetadata=function(){safePlay()};video.load();return;
  }
  backend="html5";setEngineLabel("HTML5 sem HLS");
  C.toast("Este ambiente não oferece reprodução HLS.",5000);
}
function playDirect(url,progress){
  destroyHls();backend="html5";setEngineLabel("HTML5 direto");video.style.display="block";video.src=url;video.load();
  video.onloadedmetadata=function(){
    if(current&&current.type!=="live"&&progress&&progress.position>8&&progress.percent<.97){
      try{video.currentTime=Math.min(progress.position,Math.max(0,video.duration-3));C.toast("Continuando de "+C.fmt(progress.position))}catch(e){}
    }
    safePlay();
  };
}
function safePlay(){try{var p=video.play();if(p&&p.catch)p.catch(function(){showControls()})}catch(e){showControls()}}
function close(){
  if(!opened)return true;
  if(!aspectMenu.classList.contains("hidden")){aspectMenu.classList.add("hidden");C.byId("aspectBtn").focus();return true}
  persist();opened=false;clearInterval(saveTimer);clearTimeout(hideTimer);destroyHls();
  try{video.pause();video.removeAttribute("src");video.load()}catch(e){}
  setEngineLabel("");overlay.classList.add("hidden");
  if(window.AuroraApp&&AuroraApp.restoreFocus)AuroraApp.restoreFocus();return true;
}
function persist(){
  if(!current||current.type==="live")return;
  C.saveProgress(current,video.currentTime||0,isFinite(video.duration)?video.duration:0);
}
function toggle(){if(video.paused)safePlay();else try{video.pause()}catch(e){}updatePlayIcon();showControls()}
function restart(){if(!current||current.type==="live")return;try{video.currentTime=0;safePlay()}catch(e){}showControls()}
function seek(n){if(!current||current.type==="live")return;try{video.currentTime=Math.max(0,Math.min(video.duration||1e9,video.currentTime+n))}catch(e){}showControls()}
function update(){
  if(!video||current&&current.type==="live")return;
  var d=isFinite(video.duration)?video.duration:0,p=d?Math.max(0,Math.min(100,(video.currentTime/d)*100)):0;
  C.byId("progressBar").style.width=p+"%";C.byId("currentTime").textContent=C.fmt(video.currentTime);C.byId("durationTime").textContent=C.fmt(d);
}
function updatePlayIcon(){C.byId("playPauseBtn").textContent=video.paused?"▶":"Ⅱ"}
function showControls(){
  if(!opened)return;overlay.classList.remove("controls-hidden");clearTimeout(hideTimer);
  if(!video.paused&&aspectMenu.classList.contains("hidden"))hideTimer=setTimeout(function(){overlay.classList.add("controls-hidden")},4500);
}
function toggleAspectMenu(){
  aspectMenu.classList.toggle("hidden");showControls();
  if(!aspectMenu.classList.contains("hidden")){var b=aspectMenu.querySelector("[data-aspect='"+aspect+"']")||aspectMenu.querySelector("button");if(b)b.focus()}
}
function updateAspectLabel(){
  var labels={original:"Original",auto:"Automático",letterbox:"Letterbox",fill:"Preencher tela","16:9":"16:9","4:3":"4:3",zoom:"Zoom"};
  C.byId("aspectLabel").textContent=labels[aspect]||"Automático";
}
function setAspect(mode){
  if(mode==="reset")mode="auto";aspect=mode||"auto";
  ["mode-auto","mode-original","mode-letterbox","mode-fill","mode-169","mode-43","mode-zoom"].forEach(function(c){stage.classList.remove(c)});
  stage.classList.add(mode==="16:9"?"mode-169":mode==="4:3"?"mode-43":"mode-"+mode);C.write("aspect",mode);updateAspectLabel();
}
function onVideoError(){
  if(!opened)return;
  if(backend==="hlsjs")return;
  var code=video.error?video.error.code:0,msg=code===4?"Formato/codec não suportado no player direto.":"Falha ao reproduzir este conteúdo.";
  C.toast(msg,4200);showControls();
}
function handleKey(e){
  if(!opened)return false;var code=e.keyCode||e.which;showControls();
  if(code===10009||code===8||e.key==="Escape")return close();
  if(code===415){safePlay();updatePlayIcon();return true}
  if(code===19){try{video.pause()}catch(x){}updatePlayIcon();return true}
  if(code===413){return close()}if(code===412){seek(-10);return true}if(code===417){seek(10);return true}if(code===10252){toggle();return true}
  if(code===37){C.move("left");return true}if(code===38){C.move("up");return true}if(code===39){C.move("right");return true}if(code===40){C.move("down");return true}
  if(code===13){var el=document.activeElement;if(el&&typeof el.click==="function")el.click();return true}return false;
}
window.AuroraPlayer={init:init,play:play,close:close,isOpen:isOpen,handleKey:handleKey,setAspect:setAspect};
})();