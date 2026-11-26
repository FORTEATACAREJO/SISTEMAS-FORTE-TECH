/* FORTE ATENDE: indicador PWA. Somente contagens agregadas, sem dados pessoais. */
(()=>{
 "use strict";
 let unread=0;
 const baseTitle=document.title;
 const supported=()=>typeof navigator!=="undefined" && "setAppBadge" in navigator;
 async function setUnread(value){
  const next=Number(value);
  unread=Number.isSafeInteger(next)?Math.max(0,Math.min(9999,next)):0;
  const counter=document.getElementById("forte-atende-unread-counter");
  if(counter){counter.textContent=unread>99?"99+":String(unread);counter.hidden=unread===0;}
  document.title=(unread?"("+unread+") ":"")+baseTitle;
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
 pill.style.cssText="min-width:24px;height:24px;padding:0 6px;display:inline-flex;vertical-align:middle;align-items:center;justify-content:center;border-radius:20px;background:#d93025;color:white;font:700 13px system-ui;box-shadow:0 2px 7px #0004;margin-left:8px";
 pill.hidden=true;
 const mount=()=>{const heading=document.querySelector(".app-title h1");(heading||document.body).appendChild(pill);};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
 else mount();
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
