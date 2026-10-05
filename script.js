 window.addEventListener('error',e=>{
  let b=document.getElementById('errbar');
  if(!b){b=document.createElement('div');b.id='errbar';b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99;background:#b91c1c;color:#fff;padding:10px 14px;font:13px/1.3 monospace;word-break:break-word';document.body.appendChild(b);}
  b.textContent='Erro no site: '+e.message+' ('+String(e.filename||'').split('/').pop()+':'+e.lineno+')';
});
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let motivo='';
const cfg={
  apiKey: "AIzaSyDtIK3NODGnnx2tSUSW3akVf7lVgdACq6Y",
  authDomain: "sistema-cotacao-pmg.firebaseapp.com",
  projectId: "sistema-cotacao-pmg",
  storageBucket: "sistema-cotacao-pmg.firebasestorage.app",
  messagingSenderId: "147814501670",
  appId: "1:147814501670:web:e5adff7bc8f32bfa4145e7"
};
const configured=(()=>{
  if(typeof firebase==='undefined'){motivo='A biblioteca do Firebase não carregou. Verifique a internet ou desative o bloqueador de anúncios para este site.';return false;}
  if(!cfg){motivo='O arquivo firebase-config.js não foi lido. Confira se ele está na raiz do repositório e se começa com: const firebaseConfig = {';return false;}
  if(!cfg.apiKey||String(cfg.apiKey).startsWith('COLE')){motivo='Firebase não configurado. Cole as chaves do seu projeto em firebase-config.js.';return false;}
  return true;
})();
let auth,col;
if(configured){
  try{firebase.initializeApp(cfg);auth=firebase.auth();col=firebase.firestore().collection('cotacoes');}
  catch(e){motivo='Erro ao iniciar o Firebase: '+e.message;}
}
const fbOk=configured&&!!auth;
const brl=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fdate=d=>d?d.split('-').reverse().join('/'):'';
const today=()=>new Date().toISOString().slice(0,10);

let data=[], tab='cot', editId=null;
const total=c=>c.qtd*c.preco;

function filtered(){
  const q=$('#q').value.trim().toLowerCase(), cat=$('#cat').value;
  return data.filter(c=>(!cat||c.cat===cat)&&(!q||[c.item,c.emp,c.cnpj].some(v=>String(v).toLowerCase().includes(q))));
}
function byItem(list){
  const m={}; list.forEach(c=>(m[c.item]??=[]).push(c));
  Object.values(m).forEach(a=>a.sort((x,y)=>x.preco-y.preco));
  return m;
}
function savings(list){
  return Object.values(byItem(list)).reduce((s,a)=>a.length>1?s+(a[a.length-1].preco-a[0].preco)*a[0].qtd:s,0);
}

function renderKpis(){
  $('#k1').textContent=data.length;
  $('#k2').textContent=new Set(data.map(c=>c.item)).size;
  $('#k3').textContent=new Set(data.map(c=>c.emp)).size;
  $('#k4').textContent=brl(savings(data));
  const cats=[...new Set(data.map(c=>c.cat).filter(Boolean))].sort(), cur=$('#cat').value;
  $('#cat').innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option ${c===cur?'selected':''}>${esc(c)}</option>`).join('');
  $('#cats').innerHTML=cats.map(c=>`<option value="${esc(c)}">`).join('');
}

function render(){
  const list=filtered(), groups=byItem(list), v=$('#view');
  if(!list.length){v.innerHTML='<div class="empty">Nenhuma cotação encontrada. Use "Nova cotação" ou "Importar".</div>';return;}
  if(tab==='cot'){
    const cheapest=new Set(Object.values(groups).filter(a=>a.length>1).map(a=>a[0].id));
    v.innerHTML=`<div class="scroll"><table><thead><tr><th>Item</th><th>Empresa</th><th>Qtd</th><th>Preço unit.</th><th>Total</th><th>Data</th><th></th></tr></thead><tbody>`+
    list.map(c=>`<tr><td>${esc(c.item)}<small>${esc(c.cat)}</small></td>
      <td>${esc(c.emp)}${cheapest.has(c.id)?'<span class="badge">Mais<br>barato</span>':''}<small>${esc(c.cnpj)}</small></td>
      <td>${c.qtd}</td><td>${brl(c.preco)}</td><td>${brl(total(c))}</td><td>${fdate(c.data)}</td>
      <td style="white-space:nowrap"><button class="btn sm" data-edit="${c.id}">Editar</button> <button class="btn sm" data-del="${c.id}">Excluir</button></td></tr>`).join('')+`</tbody></table></div>`;
  }else if(tab==='mapa'){
    v.innerHTML='<div class="pad">'+Object.entries(groups).map(([item,a])=>`<div class="grp"><h3>${esc(item)}</h3><div class="scroll"><table style="min-width:480px"><thead><tr><th>Empresa</th><th>Preço unit.</th><th>Total</th><th>Diferença</th></tr></thead><tbody>`+
      a.map((c,i)=>`<tr><td>${esc(c.emp)}${i===0&&a.length>1?'<span class="badge">Mais barato</span>':''}</td><td>${brl(c.preco)}</td><td>${brl(total(c))}</td><td>${i?'+'+((c.preco/a[0].preco-1)*100).toFixed(1)+'%':'—'}</td></tr>`).join('')+`</tbody></table></div></div>`).join('')+'</div>';
  }else if(tab==='graf'){
    v.innerHTML='<div class="pad">'+Object.entries(groups).map(([item,a])=>{const mx=Math.max(...a.map(total));
      return `<div class="grp"><h3>${esc(item)}</h3>`+a.map((c,i)=>`<div class="row"><span>${esc(c.emp)}</span><div class="bar"><i class="${i===0?'min':''}" style="width:${total(c)/mx*100}%"></i></div><b>${brl(total(c))}</b></div>`).join('')+'</div>';}).join('')+'</div>';
  }else{
    v.innerHTML='<div class="pad">'+Object.entries(groups).map(([item,a])=>{
      const b=a[0], w=a[a.length-1], eco=(w.preco-b.preco)*b.qtd;
      return `<div class="ai"><b>${esc(item)}</b><br>Compre de <b>${esc(b.emp)}</b>: ${b.qtd} un. a ${brl(b.preco)} = ${brl(total(b))}.`+
      (a.length>1?` Economia de ${brl(eco)} frente à proposta mais cara (${esc(w.emp)}).`:' Só há uma proposta; peça outras cotações para comparar.')+'</div>';}).join('')+
      `<p class="hint">A sugestão compara preço unitário e quantidade de cada item. Total estimado com as melhores propostas: <b>${brl(Object.values(groups).reduce((s,a)=>s+total(a[0]),0))}</b>.</p></div>`;
  }
}
const refresh=()=>{renderKpis();render();};

/* Abas e filtros */
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');tab=b.dataset.t;render();});
$('#q').oninput=render; $('#cat').onchange=render;

/* Modais */
const open=id=>$(id).classList.add('open'), closeAll=()=>$$('.modal').forEach(m=>m.classList.remove('open'));
$$('[data-close]').forEach(b=>b.onclick=closeAll);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});

function openCot(c){
  editId=c?c.id:null; $('#cotTitle').textContent=c?'Editar cotação':'Nova cotação'; $('#cotErr').textContent='';
  $('#fItem').value=c?.item||''; $('#fCat').value=c?.cat||''; $('#fEmp').value=c?.emp||''; $('#fCnpj').value=c?.cnpj||'';
  $('#fQtd').value=c?.qtd||1; $('#fPreco').value=c?.preco??''; $('#fData').value=c?.data||today(); open('#mCot');
}
$('#bNova').onclick=()=>openCot();
$('#saveCot').onclick=async()=>{
  const c={item:$('#fItem').value.trim(),cat:$('#fCat').value.trim()||'Geral',emp:$('#fEmp').value.trim(),cnpj:$('#fCnpj').value.trim(),
    qtd:+$('#fQtd').value,preco:+$('#fPreco').value,data:$('#fData').value||today()};
  if(!c.item||!c.emp||!(c.qtd>0)||!(c.preco>0)){$('#cotErr').textContent='Informe item, empresa, quantidade e preço maiores que zero.';return;}
  try{
    if(editId)await col.doc(editId).update(c);
    else await col.add({...c,criadoPor:auth.currentUser.email,criadoEm:firebase.firestore.FieldValue.serverTimestamp()});
    closeAll();
  }catch(err){$('#cotErr').textContent='Não foi possível salvar: '+err.message;}
};
$('#view').onclick=e=>{
  const ed=e.target.closest('[data-edit]'), dl=e.target.closest('[data-del]');
  if(ed)openCot(data.find(x=>x.id==ed.dataset.edit));
  if(dl&&confirm('Excluir esta cotação?'))col.doc(dl.dataset.del).delete().catch(err=>alert('Não foi possível excluir: '+err.message));
};

/* Excel */
const cols=['Item','Categoria','Empresa','CNPJ','Quantidade','Preço unitário','Data'];
const toRow=c=>[c.item,c.cat,c.emp,c.cnpj,c.qtd,c.preco,c.data];
function download(rows,name){
  if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cols,...rows]),'Cotações');XLSX.writeFile(wb,name+'.xlsx');return;}
  const csv='\ufeff'+[cols,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=name+'.csv';a.click();
}
$('#bExp').onclick=()=>download(filtered().map(toRow),'cotacoes-pmg');
$('#bMod').onclick=()=>download([['Resma de papel A4 500 folhas','Papelaria','Empresa Exemplo','00.000.000/0001-00',100,25.5,today()]],'modelo-cotacoes');
$('#bImp').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{
    if(!window.XLSX)throw new Error('Biblioteca de planilhas indisponível (verifique a internet).');
    const wb=XLSX.read(await f.arrayBuffer(),{cellDates:false});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1}).slice(1).filter(r=>r[0]&&r[2]);
    for(let i=0;i<rows.length;i+=400){
      const batch=col.firestore.batch();
      rows.slice(i,i+400).forEach(r=>batch.set(col.doc(),{item:String(r[0]),cat:String(r[1]||'Geral'),emp:String(r[2]),cnpj:String(r[3]||''),qtd:+r[4]||1,preco:+String(r[5]).replace(',','.')||0,data:String(r[6]||today()),criadoPor:auth.currentUser.email,criadoEm:firebase.firestore.FieldValue.serverTimestamp()}));
      await batch.commit();
    }
    alert(rows.length+' cotação(ões) importada(s).');
  }catch(err){alert('Não foi possível importar: '+err.message);}
  e.target.value='';
};

/* Assinaturas */
const pads={};
function pad(id){
  const cv=$('#'+id),ctx=cv.getContext('2d');let drawing=false,dirty=false;
  function size(){const r=cv.getBoundingClientRect();if(!r.width)return;cv.width=r.width*2;cv.height=r.height*2;ctx.scale(2,2);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.strokeStyle='#0a1a3a';dirty=false;}
  const pt=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  cv.addEventListener('pointerdown',e=>{drawing=true;dirty=true;cv.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...pt(e));});
  cv.addEventListener('pointermove',e=>{if(!drawing)return;ctx.lineTo(...pt(e));ctx.stroke();});
  ['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>drawing=false));
  pads[id]={size,clear:()=>{ctx.clearRect(0,0,cv.width,cv.height);dirty=false;},img:()=>dirty?cv.toDataURL('image/png'):''};
}
pad('sPres');pad('sDir');
$$('[data-clr]').forEach(b=>b.onclick=()=>pads[b.dataset.clr].clear());
$('#bRel').onclick=()=>{
  const n=Object.keys(byItem(filtered())).length;
  if(!n){alert('Não há cotações no filtro atual.');return;}
  $('#relInfo').textContent=`O relatório usa as cotações do filtro atual (${n} item(ns)) e inclui as assinaturas da Presidência e da Diretoria.`;
  open('#mRel');pads.sPres.size();pads.sDir.size();
};
$('#goRel').onclick=()=>{
  const list=filtered(),g=byItem(list),d=fdate(today());
  const sig=(img,nome,cargo,status)=>`<div class="s">${img?`<img src="${img}">`:'<div style="height:90px"></div>'}<hr><b>${esc(nome||'________________')}</b><br>${esc(cargo)}<br><small>${status} em ${d}</small></div>`;
  const body=Object.entries(g).map(([item,a])=>`<h3>${esc(item)}</h3><table><tr><th>Empresa</th><th>CNPJ</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr>`+
    a.map((c,i)=>`<tr${i===0&&a.length>1?' class="m"':''}><td>${esc(c.emp)}${i===0&&a.length>1?' (mais barato)':''}</td><td>${esc(c.cnpj)}</td><td>${c.qtd}</td><td>${brl(c.preco)}</td><td>${brl(total(c))}</td></tr>`).join('')+'</table>').join('');
  const w=window.open('','_blank');
  if(!w){alert('Permita pop-ups para gerar o relatório.');return;}
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de cotações — PMG</title><style>
  body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0}h3{margin:22px 0 6px}table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;font-size:13px}th{background:#eef2f7}.m{background:#d9f5e8;font-weight:bold}
  .sg{display:flex;gap:40px;margin-top:50px}.s{flex:1;text-align:center}.s img{height:90px;max-width:100%}.s hr{border:0;border-top:1px solid #111;margin:4px 0 8px}
  </style></head><body><h1>Relatório de cotações — PMG</h1><p>Setor de Administração · emitido em ${d}<br>Economia potencial: <b>${brl(savings(list))}</b></p>${body}
  <div class="sg">${sig(pads.sPres.img(),$('#nPres').value,$('#cPres').value,'Autorizado')}${sig(pads.sDir.img(),$('#nDir').value,$('#cDir').value,'Liberado')}</div>
  <script>setTimeout(()=>print(),400)<\/script></body></html>`);
  w.document.close();closeAll();
};

/* Tema */
function setTheme(t){document.documentElement.dataset.theme=t;$('#theme').textContent=t==='dark'?'☀':'🌙';localStorage.setItem('pmg_theme',t);}
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
setTheme(localStorage.getItem('pmg_theme')||'dark');

/* Login com Firebase Authentication + dados em tempo real no Firestore */
const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const msgs={'auth/invalid-credential':'E-mail ou senha incorretos.','auth/wrong-password':'E-mail ou senha incorretos.','auth/user-not-found':'E-mail ou senha incorretos.',
 'auth/email-already-in-use':'Já existe uma conta com este e-mail.','auth/weak-password':'A senha precisa ter no mínimo 6 caracteres.','auth/invalid-email':'Informe um e-mail válido.',
 'auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos e tente de novo.','auth/network-request-failed':'Sem conexão com a internet.'};
const erro=e=>msgs[e.code]||('Erro: '+(e.message||e.code));
function show(v){$('#vLogin').hidden=v!=='login';$('#vSign').hidden=v!=='sign';$('#lerr').textContent=$('#serr').textContent='';$('#lerr').style.color='';}
$('#toSign').onclick=()=>show('sign'); $('#toLogin').onclick=()=>show('login');

$('#sgo').onclick=async()=>{
  const nome=$('#sn').value.trim(), email=$('#se').value.trim().toLowerCase(), s1=$('#sp').value, s2=$('#sp2').value, err=$('#serr');
  if(!nome)return err.textContent='Informe o seu nome.';
  if(!emailOk(email))return err.textContent='Informe um e-mail válido.';
  if(s1.length<6)return err.textContent='A senha precisa ter no mínimo 6 caracteres.';
  if(s1!==s2)return err.textContent='As senhas não conferem.';
  try{
    const cred=await auth.createUserWithEmailAndPassword(email,s1);
    await cred.user.updateProfile({displayName:nome});
    $('#who').textContent=nome;
    ['sn','se','sp','sp2'].forEach(i=>$('#'+i).value='');
  }catch(e){err.textContent=erro(e);}
};
$('#lgo').onclick=async()=>{
  const email=$('#lu').value.trim().toLowerCase();
  try{await auth.signInWithEmailAndPassword(email,$('#lp').value);$('#lp').value='';}
  catch(e){$('#lerr').textContent=erro(e);}
};
$('#forgot').onclick=async()=>{
  const email=$('#lu').value.trim().toLowerCase(), err=$('#lerr');
  if(!emailOk(email)){err.style.color='';return err.textContent='Digite o seu e-mail acima e toque em "Esqueci minha senha".';}
  try{await auth.sendPasswordResetEmail(email);err.style.color='var(--ok)';err.textContent='Enviamos um link para redefinir a senha. Veja também o spam.';}
  catch(e){err.style.color='';err.textContent=erro(e);}
};
$('#lp').addEventListener('keydown',e=>{if(e.key==='Enter')$('#lgo').click();});
$('#sp2').addEventListener('keydown',e=>{if(e.key==='Enter')$('#sgo').click();});
$('#logout').onclick=()=>auth&&auth.signOut();

let unsub=null;
if(!fbOk){
  $('#login').classList.add('open');
  $('#vLogin').innerHTML='<p class="err">'+esc(motivo||'Firebase indisponível.')+'</p>';
}else{
  auth.onAuthStateChanged(user=>{
    $('#login').classList.toggle('open',!user);
    $('#who').textContent=user?(user.displayName||user.email):'';
    if(unsub){unsub();unsub=null;}
    if(user){
      unsub=col.onSnapshot(s=>{data=s.docs.map(d=>({id:d.id,...d.data()}));refresh();},
        err=>alert('Sem permissão para ler as cotações: '+err.message));
    }else{data=[];refresh();show('login');}
  });
}
refresh();
