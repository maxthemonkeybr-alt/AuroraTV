(function(){
"use strict";
var NS="auroraTV.",focusCache=null,focusDirty=true,lastMove=0,favCache=null,progressCache=null;
function byId(id){return document.getElementById(id)}
function read(k,f){try{var v=localStorage.getItem(NS+k);return v===null?f:JSON.parse(v)}catch(e){return f}}
function write(k,v){try{localStorage.setItem(NS+k,JSON.stringify(v));return true}catch(e){return false}}
function remove(k){try{localStorage.removeItem(NS+k)}catch(e){}}
function invalidateFocus(){focusDirty=true;focusCache=null}
function visible(el){return !!(el&&!el.disabled&&el.getClientRects&&el.getClientRects().length)}
function focusables(){
  if(!focusDirty&&focusCache)return focusCache;
  focusCache=Array.prototype.slice.call(document.querySelectorAll("[data-focusable]")).filter(visible);
  focusDirty=false;return focusCache;
}
function move(dir){
  var now=Date.now();if(now-lastMove<45)return;lastMove=now;
  var list=focusables(),cur=document.activeElement;if(!list.length)return;
  if(list.indexOf(cur)<0){list[0].focus();return}
  var a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2,best=null,score=1e12;
  for(var i=0;i<list.length;i++){
    var el=list[i];if(el===cur)continue;var r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-ax,dy=y-ay;
    if((dir==="left"&&dx>=-2)||(dir==="right"&&dx<=2)||(dir==="up"&&dy>=-2)||(dir==="down"&&dy<=2))continue;
    var primary=(dir==="left"||dir==="right")?Math.abs(dx):Math.abs(dy),secondary=(dir==="left"||dir==="right")?Math.abs(dy):Math.abs(dx),s=primary+secondary*2.15;
    if(s<score){score=s;best=el}
  }
  if(best){best.focus();try{best.scrollIntoView({block:"nearest",inline:"nearest"})}catch(e){best.scrollIntoView(false)}}
}
var backHandlers=[];
function onBack(fn){backHandlers.push(fn);return function(){var i=backHandlers.indexOf(fn);if(i>=0)backHandlers.splice(i,1)}}
function back(){for(var i=backHandlers.length-1;i>=0;i--){try{if(backHandlers[i]()===true)return true}catch(e){}}return false}
function registerKeys(){try{if(window.tizen&&tizen.tvinputdevice){["MediaPlayPause","MediaPlay","MediaPause","MediaStop","MediaFastForward","MediaRewind","ColorF0Red","ColorF1Green","ColorF2Yellow","ColorF3Blue"].forEach(function(k){try{tizen.tvinputdevice.registerKey(k)}catch(e){}})}}catch(e){}}
function keydown(e){
  var code=e.keyCode||e.which;
  if(window.AuroraPlayer&&AuroraPlayer.isOpen()&&AuroraPlayer.handleKey(e)){e.preventDefault();return}
  if(code===37){move("left");e.preventDefault()}else if(code===38){move("up");e.preventDefault()}else if(code===39){move("right");e.preventDefault()}else if(code===40){move("down");e.preventDefault()}
  else if(code===13){var el=document.activeElement;if(el&&typeof el.click==="function"){el.click();e.preventDefault()}}
  else if(code===10009||code===8||e.key==="Escape"){if(back())e.preventDefault()}
}
var toastTimer;
function toast(msg,ms){var el=byId("toast");if(!el)return;el.textContent=msg;el.classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.add("hidden")},ms||2600)}
function loading(on,text){var el=byId("loading");if(!el)return;var s=el.querySelector("span");if(s&&text)s.textContent=text;el.classList.toggle("hidden",!on)}
function keyFor(item){return String(item.type||"item")+":"+String(item.id)}
function favorites(){if(!favCache)favCache=read("favorites",[]);return favCache}
function isFavorite(item){return favorites().indexOf(keyFor(item))>=0}
function toggleFavorite(item){var a=favorites(),k=keyFor(item),i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);write("favorites",a);return i<0}
function progressAll(){if(!progressCache)progressCache=read("progress",{});return progressCache}
function saveProgress(item,pos,dur){
  if(!item||item.type==="live"||!isFinite(pos)||pos<0)return;
  var all=progressAll(),k=keyFor(item),pct=dur>0?pos/dur:0,copy={type:item.type,id:item.id,title:item.title,image:item.image||"",seriesId:item.seriesId||null,season:item.season||null,episode:item.episode||null,ext:item.ext||null};
  all[k]={position:pos,duration:dur||0,percent:pct,updatedAt:Date.now(),item:copy};if(pct>=.97)delete all[k];write("progress",all);
}
function getProgress(item){return progressAll()[keyFor(item)]||null}
function continueItems(){var p=progressAll(),out=[];Object.keys(p).forEach(function(k){var v=p[k];if(v&&v.item&&v.position>8&&v.percent<.97)out.push(v)});out.sort(function(a,b){return b.updatedAt-a.updatedAt});return out}
function clearProgress(){progressCache={};write("progress",{})}
function pad2(n){return(n<10?"0":"")+n}
function fmt(sec){sec=Math.max(0,Math.floor(sec||0));var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return(h?pad2(h)+":":"")+pad2(m)+":"+pad2(s)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function clock(){var el=byId("clock");if(el){var d=new Date();el.textContent=pad2(d.getHours())+":"+pad2(d.getMinutes())}}
function init(){
  registerKeys();document.addEventListener("keydown",keydown);clock();setInterval(clock,30000);
  try{new MutationObserver(function(){invalidateFocus()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","disabled"]})}catch(e){}
}
window.AuroraCore={init:init,byId:byId,read:read,write:write,remove:remove,move:move,invalidateFocus:invalidateFocus,onBack:onBack,toast:toast,loading:loading,keyFor:keyFor,favorites:favorites,isFavorite:isFavorite,toggleFavorite:toggleFavorite,saveProgress:saveProgress,getProgress:getProgress,continueItems:continueItems,clearProgress:clearProgress,fmt:fmt,esc:esc,focusFirst:function(){var f=focusables();if(f[0])f[0].focus()}};
})();