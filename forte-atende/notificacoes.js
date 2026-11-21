/* FORTE ATENDE: indicador PWA. Somente contagens agregadas, sem dados pessoais. */
(()=>{
 "use strict";
 let unread=0;
 const supported=()=>typeof navigator!=="undefined" && "setAppBadge" in navigator;
 async function setUnread(value){
  unread=Math.max(0,Math.min(9999,Number(value)||0));
  const counter=document.getElementById("forte-atende-unread-counter");
  if(counter){counter.textContent=unread>99?"99+":String(unread);counter.hidden=unread===0;}
  document.title=(unread?"("+unread+") ":"")+"FORTE ATENDE";
  try{
   if(supported()){
    if(unread)await navigator.setAppBadge(unread);
    else if(navigator.clearAppBadge)await navigator.clearAppBadge();
   }
  }catch{/* badge pode ser recusado pelo navegador/launcher */}
 }
 const pill=document.createElement("span");
 pill.id="forte-atende-unread-counter";
 pill.setAttribute("aria-label","Atendimentos não lidos");
 pill.style.cssText="position:fixed;top:12px;right:12px;z-index:9999;min-width:24px;height:24px;padding:0 5px;display:flex;align-items:center;justify-content:center;border-radius:20px;background:#d93025;color:white;font:700 13px system-ui;box-shadow:0 2px 7px #0004";
 pill.hidden=true;
 document.addEventListener("DOMContentLoaded",()=>document.body.appendChild(pill),{once:true});
 window.FORTE_ATENDE_NOTIFICACOES=Object.freeze({
  atualizarNaoLidas:setUnread,
  total:()=>unread,
  async solicitarPermissao(){
   if(!("Notification" in window))return "unsupported";
   if(Notification.permission!=="default")return Notification.permission;
   return Notification.requestPermission();
  },
  async avisar({titulo="Nova mensagem no FORTE ATENDE",texto="Você tem um atendimento não lido",url="./painel.html"}={}){
   if(!("Notification" in window)||Notification.permission!=="granted")return false;
   if("serviceWorker" in navigator){
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification(titulo,{body:texto,icon:"./icons/forte-atende-192.png",badge:"./icons/forte-atende-192.png",tag:"forte-atende-nova-mensagem",data:{url}});
    return true;
   }
   return false;
  }
 });
})();
