/* =====================================================================
   AT1 RPS - Análise Detalhada → REINCIDÊNCIA  (+ correção NODEs)
   Arquivo complementar: carregar DEPOIS do script principal do index.html
   <script src="reincidencia.js"></script>  (antes de </body>)
   ===================================================================== */
(function(){
  'use strict';

  /* ---------- 0) Correção NODEs: tira detailNodes de dentro de detailMdu ---------- */
  function fixNodesNesting(){
    var n=document.getElementById('detailNodes'),m=document.getElementById('detailMdu');
    if(n&&m&&m.contains(n))m.after(n);
  }

  /* ---------- utilidades ---------- */
  var RE={rows:[],month:null,seq:0,sel:{grupo:null,municipio:null,endereco:null,familia:null}};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function nf(v){return Number(v||0).toLocaleString('pt-BR')}
  function mLabel(m){try{return monthLabel(m)}catch(e){return m}}
  function curMonth(){try{return MONTH}catch(e){return null}}
  function months(){try{return AVAILABLE_MONTHS||[]}catch(e){return[]}}
  function sb(){try{return at1Supabase}catch(e){return null}}
  function addrKey(r){return r.endereco+'|||'+r.municipio}

  /* ---------- 1) Estilos ---------- */
  function injectCss(){
    if(document.getElementById('reincCss'))return;
    var s=document.createElement('style');s.id='reincCss';
    s.textContent=
    '#detailReinc .reKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:14px 0}'+
    '#detailReinc .reKpi{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 5px 20px #0000000c}'+
    '#detailReinc .reKpi b{display:block;font-size:11px;color:#667085;text-transform:uppercase;letter-spacing:.3px}'+
    '#detailReinc .reKpi div{font-size:24px;font-weight:900;color:#1d1d1f;margin-top:4px}'+
    '#detailReinc .reGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}'+
    '#detailReinc .reCard{background:#fff;border-radius:18px;box-shadow:0 5px 20px #0000000c;padding:18px;min-width:0}'+
    '#detailReinc .reCard h3{margin:0 0 4px;font-size:16px}'+
    '#detailReinc .reSub{font-size:12px;color:#667085;margin-bottom:10px}'+
    '#detailReinc .reWrap{max-height:430px;overflow:auto;border:1px solid #eef0f3;border-radius:10px}'+
    '#detailReinc table{width:100%;border-collapse:collapse;font-size:12.5px}'+
    '#detailReinc thead th{position:sticky;top:0;background:#302c20;color:#fff;padding:8px 10px;text-align:right;font-weight:800;z-index:1}'+
    '#detailReinc thead th:first-child{text-align:left}'+
    '#detailReinc tbody td{padding:7px 10px;border-bottom:1px solid #f0f1f3;text-align:right;white-space:nowrap}'+
    '#detailReinc tbody td:first-child{text-align:left;white-space:normal}'+
    '#detailReinc tbody tr{cursor:pointer}'+
    '#detailReinc tbody tr:hover{background:#fff3f2}'+
    '#detailReinc tbody tr.reOn{background:#e3261a;color:#fff}'+
    '#detailReinc tbody tr.reOn .reBar{background:#fff}'+
    '#detailReinc tfoot td{padding:8px 10px;font-weight:900;text-align:right;background:#f6f7f9;position:sticky;bottom:0}'+
    '#detailReinc tfoot td:first-child{text-align:left}'+
    '#detailReinc .reBarBox{height:4px;background:#f1f1f1;border-radius:3px;margin-top:4px}'+
    '#detailReinc .reBar{height:4px;background:#e3261a;border-radius:3px}'+
    '#detailReinc .reCity{display:block;font-size:11px;opacity:.7}'+
    '#detailReinc .reChips{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 12px}'+
    '#detailReinc .reChip{background:#e3261a;color:#fff;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800;cursor:pointer;border:0}'+
    '#detailReinc .reClear{background:#fff;border:1px solid #d0d5dd;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800;cursor:pointer}'+
    '#detailReinc .reSearch{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d0d5dd;border-radius:10px;margin-bottom:8px;font-size:12.5px}'+
    '#detailReinc .reState{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;background:#fff;border-radius:18px;padding:20px;margin-top:14px}'+
    '#detailReinc .reState span{color:#667085}'+
    '#detailReinc .reSpin{width:34px;height:34px;border:4px solid #f3c6c3;border-top-color:#e3261a;border-radius:50%;animation:reRot 1s linear infinite}'+
    '@keyframes reRot{to{transform:rotate(360deg)}}'+
    '#detailReinc [hidden]{display:none!important}'+
    '@media(max-width:900px){#detailReinc .reGrid{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  /* ---------- 2) Card no hub + view ---------- */
  function ensureView(){
    var hub=document.getElementById('detailHub');if(!hub)return null;
    var cards=hub.querySelectorAll('.hubCard');
    if(cards.length&&!document.getElementById('hubCardReinc')){
      var c=document.createElement('div');c.className='hubCard';c.id='hubCardReinc';
      c.innerHTML='<div class=hubTitle><span>REINCIDÊNCIA</span><span class=hubArrow>→</span></div><div class=hubDesc>Visitas reincidentes por grupo regional, município, endereço e família, com filtro cruzado ao clicar.</div>';
      c.onclick=openReinc;
      cards[cards.length-1].parentNode.appendChild(c);
    }
    var v=document.getElementById('detailReinc');
    if(!v){
      v=document.createElement('div');v.id='detailReinc';v.className='detailView';
      v.innerHTML=
      '<button class=detailBack data-re-back>← Voltar para Análise Detalhada</button>'+
      '<div class=filters>'+
        '<div class=f><label>COMPETÊNCIA</label><select data-re=month></select></div>'+
        '<div class=f><label>GRUPO</label><select data-re=grupo><option value="">Todos os grupos</option></select></div>'+
        '<div class=f><label>MUNICÍPIO</label><select data-re=municipio><option value="">Todos os municípios</option></select></div>'+
        '<div class=f><label>PRAZO DE REINCIDÊNCIA</label><select data-re=prazo><option value="">Todos os prazos</option></select></div>'+
      '</div>'+
      '<div class=reState data-re-loading hidden><div class=reSpin></div><b>Carregando análise de reincidência...</b><span>Aguarde enquanto consultamos os dados da competência selecionada.</span></div>'+
      '<div data-re-error hidden></div>'+
      '<div data-re-content hidden>'+
        '<div class=reKpis data-re-kpis></div>'+
        '<div class=reChips data-re-chips></div>'+
        '<div class=reGrid>'+
          '<div class=reCard><h3>1. Reincidência por Grupo Regional</h3><div class=reSub>Clique para filtrar as demais visões</div><div class=reWrap data-re-t=grupo></div></div>'+
          '<div class=reCard><h3>4. Reincidência por Família</h3><div class=reSub>Clique para filtrar as demais visões</div><div class=reWrap data-re-t=familia></div></div>'+
          '<div class=reCard><h3>2. Reincidência por Município</h3><div class=reSub>Clique para filtrar as demais visões</div><div class=reWrap data-re-t=municipio></div></div>'+
          '<div class=reCard><h3>3. Reincidência por Endereço</h3><div class=reSub>Clique para filtrar as demais visões</div><input class=reSearch data-re-search placeholder="Buscar endereço..."><div class=reWrap data-re-t=endereco></div></div>'+
        '</div>'+
      '</div>';
      var host=hub.parentNode;
      host.appendChild(v);
      v.querySelector('[data-re-back]').onclick=function(){openDetailView('hub')};
      v.querySelector('[data-re=month]').onchange=function(){resetSel();load(this.value)};
      v.querySelector('[data-re=grupo]').onchange=function(){fillCityFilter();resetSel();draw()};
      v.querySelector('[data-re=municipio]').onchange=function(){resetSel();draw()};
      v.querySelector('[data-re=prazo]').onchange=function(){draw()};
      v.querySelector('[data-re-search]').oninput=function(){drawTable('endereco')};
    }
    return v;
  }

  function hideOtherViews(){
    document.querySelectorAll('#p-detalhada .detailView').forEach(function(x){x.classList.remove('active')});
  }

  function openReinc(){
    fixNodesNesting();
    var v=ensureView();if(!v)return;
    try{charts.forEach(function(c){c.destroy()});charts=[]}catch(e){}
    hideOtherViews();v.classList.add('active');
    var sel=v.querySelector('[data-re=month]'),ms=months().slice().sort().reverse(),cur=curMonth();
    sel.innerHTML=ms.map(function(m){return '<option value="'+m+'"'+(m===(RE.month||cur)?' selected':'')+'>'+esc(mLabel(m))+'</option>'}).join('');
    load(sel.value||cur);
  }
  window.openReincidencia=openReinc;

  function state(mode,msg){
    var v=document.getElementById('detailReinc');
    v.querySelector('[data-re-loading]').hidden=mode!=='loading';
    v.querySelector('[data-re-content]').hidden=mode!=='success';
    var e=v.querySelector('[data-re-error]');e.hidden=mode!=='error';
    if(mode==='error'){
      e.innerHTML='<div class=reState><b>Não foi possível carregar a reincidência.</b><span>'+esc(msg)+'</span><button class=detailBack data-re-retry>Tentar novamente</button></div>';
      e.querySelector('[data-re-retry]').onclick=function(){load(RE.month||curMonth())};
    }
  }

  /* ---------- 3) Consulta agregada ---------- */
  async function load(month){
    if(!month)return;
    var seq=++RE.seq;RE.month=month;RE.rows=[];state('loading');
    try{
      var c=sb();if(!c)throw new Error('Sessão do Supabase não encontrada. Faça login novamente.');
      var all=[],from=0,page=1000;
      while(true){
        var r=await c.rpc('portal_reincidencia',{p_competencia:month+'-01'}).range(from,from+page-1);
        if(r.error)throw r.error;
        var d=r.data||[];all=all.concat(d);
        if(d.length<page)break;from+=page;
      }
      if(seq!==RE.seq)return;
      RE.rows=all.map(function(x){return{grupo:x.grupo,uf:x.uf,municipio:x.municipio,endereco:x.endereco,familia:x.familia,prazo:x.prazo,qtd:Number(x.qtd)||0}});
      fillFilters();state('success');draw();
    }catch(e){if(seq===RE.seq)state('error',e.message||String(e))}
  }

  /* ---------- 4) Filtros superiores ---------- */
  function prazos(){
    var s={};RE.rows.forEach(function(r){s[r.prazo]=1});
    return Object.keys(s).sort(function(a,b){return(parseInt(a)||999)-(parseInt(b)||999)||a.localeCompare(b)});
  }
  function fillFilters(){
    var v=document.getElementById('detailReinc');
    var g=v.querySelector('[data-re=grupo]'),og=g.value,gs={};RE.rows.forEach(function(r){gs[r.grupo]=1});
    var gl=Object.keys(gs).sort();
    g.innerHTML='<option value="">Todos os grupos</option>'+gl.map(function(x){return '<option>'+esc(x)+'</option>'}).join('');
    if(gl.indexOf(og)>=0)g.value=og;
    var p=v.querySelector('[data-re=prazo]'),op=p.value,pl=prazos();
    p.innerHTML='<option value="">Todos os prazos</option>'+pl.map(function(x){return '<option>'+esc(x)+'</option>'}).join('');
    if(pl.indexOf(op)>=0)p.value=op;
    fillCityFilter();
  }
  function fillCityFilter(){
    var v=document.getElementById('detailReinc'),g=v.querySelector('[data-re=grupo]').value,
        c=v.querySelector('[data-re=municipio]'),oc=c.value,cs={};
    RE.rows.forEach(function(r){if(!g||r.grupo===g)cs[r.municipio]=1});
    var cl=Object.keys(cs).sort(function(a,b){return a.localeCompare(b,'pt-BR')});
    c.innerHTML='<option value="">Todos os municípios</option>'+cl.map(function(x){return '<option>'+esc(x)+'</option>'}).join('');
    if(cl.indexOf(oc)>=0)c.value=oc;
  }
  function topFilter(){
    var v=document.getElementById('detailReinc');
    return{grupo:v.querySelector('[data-re=grupo]').value,municipio:v.querySelector('[data-re=municipio]').value,prazo:v.querySelector('[data-re=prazo]').value};
  }
  function resetSel(){RE.sel={grupo:null,municipio:null,endereco:null,familia:null}}

  /* ---------- 5) Filtro cruzado ---------- */
  // Cada visão é filtrada pelos filtros superiores + seleções clicadas nas OUTRAS visões.
  function rowsFor(dim){
    var f=topFilter(),s=RE.sel;
    return RE.rows.filter(function(r){
      if(f.grupo&&r.grupo!==f.grupo)return false;
      if(f.municipio&&r.municipio!==f.municipio)return false;
      if(f.prazo&&r.prazo!==f.prazo)return false;
      if(dim!=='grupo'&&s.grupo&&r.grupo!==s.grupo)return false;
      if(dim!=='municipio'&&s.municipio&&r.municipio!==s.municipio)return false;
      if(dim!=='endereco'&&s.endereco&&addrKey(r)!==s.endereco)return false;
      if(dim!=='familia'&&s.familia&&r.familia!==s.familia)return false;
      return true;
    });
  }
  function pivot(rows,dim,cols){
    var m={};
    rows.forEach(function(r){
      var k=dim==='endereco'?addrKey(r):r[dim];
      if(!m[k]){m[k]={key:k,label:r[dim],city:dim==='endereco'?r.municipio:'',total:0,by:{}};cols.forEach(function(c){m[k].by[c]=0})}
      m[k].by[r.prazo]=(m[k].by[r.prazo]||0)+r.qtd;m[k].total+=r.qtd;
    });
    return Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return b.total-a.total||String(a.label).localeCompare(String(b.label),'pt-BR')});
  }

  function draw(){
    var v=document.getElementById('detailReinc');if(!v)return;
    var f=topFilter(),cols=f.prazo?[f.prazo]:prazos();
    // KPIs: tudo que está filtrado + todas as seleções
    var all=rowsFor('__all__'),tot=0,byP={};
    cols.forEach(function(c){byP[c]=0});
    all.forEach(function(r){tot+=r.qtd;byP[r.prazo]=(byP[r.prazo]||0)+r.qtd});
    var addrs={};all.forEach(function(r){addrs[addrKey(r)]=1});
    v.querySelector('[data-re-kpis]').innerHTML=
      '<div class=reKpi><b>Total de reincidências</b><div>'+nf(tot)+'</div></div>'+
      cols.map(function(c){return '<div class=reKpi><b>'+esc(c)+'</b><div>'+nf(byP[c])+'</div></div>'}).join('')+
      '<div class=reKpi><b>Endereços com reincidência</b><div>'+nf(Object.keys(addrs).length)+'</div></div>'+
      '<div class=reKpi><b>Competência</b><div style="font-size:18px">'+esc(mLabel(RE.month))+'</div></div>';
    // chips das seleções
    var s=RE.sel,names={grupo:'Grupo',municipio:'Município',endereco:'Endereço',familia:'Família'},chips=[];
    Object.keys(names).forEach(function(k){if(s[k]){var t=k==='endereco'?s[k].split('|||').join(' – '):s[k];chips.push('<button class=reChip data-re-unsel="'+k+'">'+names[k]+': '+esc(t)+' ✕</button>')}});
    v.querySelector('[data-re-chips]').innerHTML=chips.length?chips.join('')+'<button class=reClear data-re-clear>Limpar seleção</button>':'';
    v.querySelectorAll('[data-re-unsel]').forEach(function(b){b.onclick=function(){RE.sel[b.dataset.reUnsel]=null;draw()}});
    var cl=v.querySelector('[data-re-clear]');if(cl)cl.onclick=function(){resetSel();draw()};
    ['grupo','municipio','endereco','familia'].forEach(drawTable);
  }

  function drawTable(dim){
    var v=document.getElementById('detailReinc'),host=v.querySelector('[data-re-t='+dim+']');
    var f=topFilter(),cols=f.prazo?[f.prazo]:prazos(),data=pivot(rowsFor(dim),dim,cols);
    var LIMIT=300,shown=data,note='';
    if(dim==='endereco'){
      var q=(v.querySelector('[data-re-search]').value||'').trim().toUpperCase();
      if(q)shown=data.filter(function(x){return String(x.label).toUpperCase().indexOf(q)>=0||String(x.city).toUpperCase().indexOf(q)>=0});
      if(shown.length>LIMIT){note='<tr><td colspan='+(cols.length+2)+' style="text-align:center;color:#667085">Exibindo os '+LIMIT+' endereços com mais reincidências de '+nf(shown.length)+'. Use a busca ou clique em um município para refinar.</td></tr>';shown=shown.slice(0,LIMIT)}
    }
    if(!data.length){host.innerHTML='<div class=reState style="min-height:120px;margin:0"><span>Sem reincidências para os filtros selecionados.</span></div>';return}
    var max=data[0].total||1,sum={},gt=0;cols.forEach(function(c){sum[c]=0});
    data.forEach(function(x){cols.forEach(function(c){sum[c]+=x.by[c]||0});gt+=x.total});
    var title={grupo:'Grupo',municipio:'Município',endereco:'Endereço',familia:'Família'}[dim];
    host.innerHTML='<table><thead><tr><th>'+title+'</th>'+cols.map(function(c){return '<th>'+esc(c)+'</th>'}).join('')+'<th>Total</th></tr></thead><tbody>'+
      shown.map(function(x){
        var on=RE.sel[dim]===x.key;
        return '<tr data-k="'+encodeURIComponent(x.key)+'" class="'+(on?'reOn':'')+'"><td>'+esc(x.label)+(x.city?'<span class=reCity>'+esc(x.city)+'</span>':'')+
          '<div class=reBarBox><div class=reBar style="width:'+Math.max(2,x.total/max*100).toFixed(1)+'%"></div></div></td>'+
          cols.map(function(c){return '<td>'+(x.by[c]?nf(x.by[c]):'')+'</td>'}).join('')+'<td><b>'+nf(x.total)+'</b></td></tr>';
      }).join('')+note+
      '</tbody><tfoot><tr><td>Total Geral</td>'+cols.map(function(c){return '<td>'+nf(sum[c])+'</td>'}).join('')+'<td>'+nf(gt)+'</td></tr></tfoot></table>';
    host.querySelectorAll('tbody tr[data-k]').forEach(function(tr){
      tr.onclick=function(){
        var k=decodeURIComponent(tr.dataset.k);
        RE.sel[dim]=RE.sel[dim]===k?null:k;
        // ao trocar grupo/município, limpa seleções mais detalhadas que não pertençam mais ao recorte
        if(dim==='grupo'){RE.sel.municipio=null;RE.sel.endereco=null}
        if(dim==='municipio'){RE.sel.endereco=null}
        draw();
      };
    });
  }

  /* ---------- 6) Integração com o portal ---------- */
  var origOpen=window.openDetailView;
  if(typeof origOpen==='function'){
    window.openDetailView=function(view){
      fixNodesNesting();
      var v=document.getElementById('detailReinc');if(v)v.classList.remove('active');
      if(view==='reincidencia')return openReinc();
      return origOpen.apply(this,arguments);
    };
  }

  function boot(){injectCss();fixNodesNesting();ensureView()}
  // a página Análise Detalhada é montada pelo init(); tenta até ela existir
  var tries=0,t=setInterval(function(){tries++;if(document.getElementById('detailHub')){boot();clearInterval(t)}else if(tries>120)clearInterval(t)},500);
  document.addEventListener('click',function(){if(document.getElementById('detailHub')&&!document.getElementById('hubCardReinc'))boot()},true);
})();
