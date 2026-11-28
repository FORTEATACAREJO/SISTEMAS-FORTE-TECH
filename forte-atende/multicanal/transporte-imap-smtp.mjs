/**
 * Implementacao IMAP/SMTP extensivel para Hostinger, provedores corporativos e
 * servidores proprios. Dependencias injetadas pelo backend:
 *   import {ImapFlow} from "imapflow";
 *   import nodemailer from "nodemailer";
 *   import {simpleParser} from "mailparser";
 *   const transport=criarTransporteImapSmtp({ImapFlow,nodemailer,simpleParser});
 *
 * Servidores, usuario e senhas devem vir exclusivamente do cofre (secret);
 * nao de campos arbitarios enviados pelo navegador (SSRF).
 */
function configValida(s){
 const imap=s?.imap,smtp=s?.smtp;
 const safeHost=h=>typeof h==="string"&&h.length<=253&&/^[a-zA-Z0-9.-]+$/.test(h)&&!h.startsWith(".")&&!h.endsWith(".");
 if(!safeHost(imap?.host)||!safeHost(smtp?.host))throw Error("Servidor de e-mail não configurado");
 if(!imap?.user||!imap?.password||!smtp?.user||!smtp?.password)throw Error("Credenciais IMAP/SMTP ausentes");
 const imapPort=Number(imap.port||993),smtpPort=Number(smtp.port||465);
 if(imapPort!==993||![465,587].includes(smtpPort))throw Error("IMAP/SMTP devem usar TLS nas portas permitidas");
 return {imap,imapPort,smtp,smtpPort};
}
const endereco=valor=>String(valor??"").trim().toLowerCase();
export function criarTransporteImapSmtp({ImapFlow,nodemailer,simpleParser}={}){
 if(typeof ImapFlow!=="function"||typeof nodemailer?.createTransport!=="function"||typeof simpleParser!=="function")
   throw Error("Bibliotecas IMAP/SMTP e parser não configuradas");
 const cliente=(s)=>{
   const {imap,imapPort}=configValida(s);
   return new ImapFlow({host:imap.host,port:imapPort,secure:true,
     auth:{user:imap.user,pass:imap.password},
     tls:{rejectUnauthorized:true,minVersion:"TLSv1.2"},logger:false});
 };
 const smtpClient=s=>{
   const {smtp,smtpPort}=configValida(s);
   return nodemailer.createTransport({host:smtp.host,port:smtpPort,secure:smtpPort===465,
     requireTLS:smtpPort===587,auth:{user:smtp.user,pass:smtp.password},
     tls:{rejectUnauthorized:true,minVersion:"TLSv1.2"}});
 };
 return {
   async verify(c,secret){
     configValida(secret);
     const imap=cliente(secret);
     let receive=false,send=false;
     try{
       await imap.connect();
       const lock=await imap.getMailboxLock("INBOX");
       try{receive=true;}finally{lock.release();}
     }finally{await imap.logout().catch(()=>{});}
     const smtp=smtpClient(secret);
     try{await smtp.verify();send=endereco(secret.verifiedSender)===c.identity;}finally{smtp.close?.();}
     // Login SMTP por si so nao autoriza alias arbitrario; servidor deve comprovar remetente.
     return {authenticated:receive,identity:c.identity,canReceive:receive,canSend:send};
   },
   async list(c,secret,{max=20}={}){
     const imap=cliente(secret),items=[];
     const size=Math.max(1,Math.min(Number(max)||20,50));
     try{
       await imap.connect();
       const lock=await imap.getMailboxLock("INBOX");
       try{
         const total=Number(imap.mailbox?.exists||0);
         if(!total)return [];
         const start=Math.max(1,total-size+1),uidValidity=String(imap.mailbox?.uidValidity||"0");
         for await(const m of imap.fetch(start+":*",{uid:true,source:true,envelope:true})){
           const parsed=await simpleParser(m.source);
           const from=parsed.from?.value?.[0]?.address??"";
           const to=parsed.to?.value?.map(x=>x.address).join(", ")||c.identity;
           items.push({externalId:uidValidity+":"+m.uid,from,to,
             subject:parsed.subject??"",text:parsed.text??"",
             receivedAt:parsed.date?.toISOString?.()??new Date().toISOString()});
           if(items.length>=size)break;
         }
       }finally{lock.release();}
     }finally{await imap.logout().catch(()=>{});}
     return items;
   },
   async send(c,secret,d){
     if(endereco(secret.verifiedSender)!==c.identity)throw Error("Identidade de envio SMTP não verificada");
     const smtp=smtpClient(secret);
     try{
       const result=await smtp.sendMail({from:c.identity,to:d.to,subject:d.subject,text:d.text});
       if(!result?.messageId)throw Error("SMTP não retornou Message-ID");
       return {externalId:result.messageId,acceptedOnly:true};
     }finally{smtp.close?.();}
   }
 };
}
