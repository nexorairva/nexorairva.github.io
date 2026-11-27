/* ----- staff: aeropuertos (catálogo completo, edición y hubs) ----- */
const APPG=40;
function apAll(){const o=[];
  Object.keys(S.ap).forEach(k=>{const a=S.ap[k];o.push({key:'N:'+k,net:1,iata:a[0],icao:k,name:a[7]||a[1],city:a[1],ctry:a[2],lat:a[3],lon:a[4],tz:a[5],hub:a[6]||''})});
  Object.keys(APX).forEach(i=>{if(ICX[i])return;const a=APX[i];o.push({key:'C:'+i,net:0,iata:i,icao:a[5]||'',name:a[4]||a[2],city:a[2],ctry:a[3],lat:a[0],lon:a[1],tz:a[6]||'',hub:''})});return o}
function apFilter(){const q=(ui.apq||'').trim().toLowerCase(),all=apAll(),r=q?all.filter(x=>(x.iata+' '+x.icao+' '+x.name+' '+x.city+' '+x.ctry).toLowerCase().includes(q)):all;
  return r.sort((a,b)=>(b.hub?2:b.net?1:0)-(a.hub?2:a.net?1:0)||a.iata.localeCompare(b.iata))}
const hubPill=h=>h?pill(h==='primary'?t('Hub principal','Primary hub'):t('Hub secundario','Secondary hub'),'acc'):''
function vSAeropuertos(){const tab=ui.apTab||'cat',tb=(k,l)=>`<button class="btn sm ${tab===k?'pri':''}" data-a="aptab" data-id="${k}">${l}</button>`,nets=Object.keys(S.ap).length,tot=Object.keys(APX).length+nets-Object.keys(APX).filter(i=>ICX[i]).length;
  let body='';
  if(tab==='cat'){const r=apFilter(),pg=Math.min(ui.app||0,Math.max(0,Math.ceil(r.length/APPG)-1)),rows=r.slice(pg*APPG,pg*APPG+APPG);
    body=`<form data-f="apq" class="card form pad"><label class="full">${t('Buscar (IATA, ICAO, nombre, ciudad o país)','Search (IATA, ICAO, name, city or country)')}<input id="apq-q" name="q" value="${esc(ui.apq||'')}" placeholder="MAD, Barajas, Lisboa…" autocomplete="off"></label><div class="full" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri sm" type="submit">${t('Buscar','Search')}</button>${ui.apq?btn(t('Ver todos','Show all'),'apclr','','sm'):''}</div></form>`+
    card(nf(r.length)+' '+t('aeropuertos','airports')+(r.length?` · ${pg*APPG+1}–${pg*APPG+rows.length}`:''),tbl(['IATA','ICAO',t('Nombre','Name'),t('Ciudad','City'),t('País','Country'),t('Estado','Status'),''],rows.map(x=>[`<b class="mono">${esc(x.iata)}</b>`,`<span class="mono">${esc(x.icao)||'—'}</span>`,esc(x.name),esc(x.city),esc(x.ctry),x.hub?hubPill(x.hub):x.net?pill(t('Red','Network'),'good'):'<span class="muted">—</span>',btn(t('Editar / Hub','Edit / Hub'),'apedit',x.key,'sm')]),t('Sin resultados.','No results.')))+
    (r.length>APPG?`<div style="display:flex;gap:8px;align-items:center;justify-content:center;margin-top:10px">${btn('‹ '+t('Anterior','Previous'),'appg','-1','sm'+(pg?'':' dis'))}<span class="muted">${pg+1} / ${Math.ceil(r.length/APPG)}</span>${btn(t('Siguiente','Next')+' ›','appg','1','sm'+(pg<Math.ceil(r.length/APPG)-1?'':' dis'))}</div>`:'')}
  else if(tab==='red'){body=card(nets+' '+t('aeropuertos en la red de NEXORA AIR','airports in the NEXORA AIR network'),tbl(['ICAO','IATA',t('Nombre','Name'),t('Ciudad','City'),'Hub',t('Zona horaria','Time zone'),''],Object.keys(S.ap).sort((a,b)=>(S.ap[b][6]?1:0)-(S.ap[a][6]?1:0)||a.localeCompare(b)).map(k=>[`<b class="mono">${k}</b>`,S.ap[k][0],esc(S.ap[k][7]),esc(S.ap[k][1]),hubPill(S.ap[k][6])||'—',S.ap[k][5],btn(t('Editar / Hub','Edit / Hub'),'apedit','N:'+k,'sm')])))}
  else{body=`<div class="card pad stack"><p class="muted">${t('Un aeropuerto del catálogo pasa a la red al marcarlo como hub o activar «En la red» al editarlo. Aquí puedes crear uno que no esté en el catálogo.','A catalogue airport joins the network when you mark it as a hub or tick “In the network” while editing. Here you can create one that is not in the catalogue.')}</p></div>`+
    `<form data-f="nap" class="card form pad"><h2 class="full">${t('Añadir aeropuerto nuevo','Add new airport')}</h2>${fld('nap','icao','ICAO','text','required pattern="[A-Za-z]{4}"')}${fld('nap','iata','IATA','text','required pattern="[A-Za-z]{3}"')}${fld('nap','city',t('Ciudad','City'),'text','required')}${fld('nap','k',t('País','Country'),'text','required maxlength="2"')}${fld('nap','lat',t('Latitud','Latitude'),'number','step="any" required min="-90" max="90"')}${fld('nap','lon',t('Longitud','Longitude'),'number','step="any" required min="-180" max="180"')}${fld('nap','tz',t('Zona horaria','Time zone'),'text','required','Europe/Madrid')}<div class="full err" id="nap-err" hidden></div><div class="full"><button class="btn pri" type="submit">${t('Añadir','Add')}</button></div></form>`+
    card(t('Importar desde OpenFlights','Import from OpenFlights'),`<div class="pad stack"><p class="muted">${t('Opcional: sube un airports.dat de OpenFlights para sobrescribir coordenadas en este navegador.','Optional: upload an OpenFlights airports.dat to override coordinates in this browser.')}</p><label>airports.dat<input id="apimp" type="file" accept=".dat,.csv,.txt"></label></div>`)}
  return head(t('Aeropuertos','Airports'),nf(tot)+' '+t('aeropuertos con coordenadas · ','airports with coordinates · ')+nets+' '+t('en la red · ','in the network · ')+Object.keys(S.ap).filter(k=>S.ap[k][6]).length+' hubs')+`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${tb('cat',t('Catálogo','Catalogue'))}${tb('red',t('Red y hubs','Network and hubs'))}${tb('add',t('Añadir / importar','Add / import'))}</div>`+body}
function apRemapRT(from,to){RT=RT.map(r=>[r[0]===from?to:r[0],r[1]===from?to:r[1],r[2]])}
Object.assign(A,{
 aptab:id=>{ui.apTab=id;render()},
 apclr:()=>{ui.apq='';ui.app=0;render()},
 appg:id=>{ui.app=Math.max(0,(ui.app||0)+(+id));render()},
 apedit:key=>{const net=key[0]==='N',k=key.slice(2),a=net?S.ap[k]:APX[k];if(!a)return;
   const x=net?{iata:a[0],icao:k,name:a[7]||a[1],city:a[1],ctry:a[2],lat:a[3],lon:a[4],tz:a[5],hub:a[6]||''}:{iata:k,icao:a[5]||'',name:a[4]||a[2],city:a[2],ctry:a[3],lat:a[0],lon:a[1],tz:a[6]||'',hub:''};
   modal(t('Editar aeropuerto ','Edit airport ')+x.iata,`<form data-f="ape" class="form pad"><input type="hidden" name="key" value="${esc(key)}">
   ${fld('ape','name',t('Nombre','Name'),'text','required maxlength="80"',x.name)}${fld('ape','city',t('Ciudad','City'),'text','required maxlength="60"',x.city)}${fld('ape','ctry',t('País','Country'),'text','required maxlength="40"',x.ctry)}
   ${fld('ape','lat',t('Latitud','Latitude'),'number','step="any" required min="-90" max="90"',x.lat)}${fld('ape','lon',t('Longitud','Longitude'),'number','step="any" required min="-180" max="180"',x.lon)}
   ${fld('ape','icao','ICAO','text','maxlength="4" pattern="[A-Za-z0-9]{4}" '+(net?'readonly':''),x.icao)}${fld('ape','tz',t('Zona horaria','Time zone'),'text','maxlength="40" placeholder="Europe/Madrid"',x.tz)}
   ${sel('ape','hub','Hub',[['',t('No es hub','Not a hub')],['primary',t('Hub principal','Primary hub')],['secondary',t('Hub secundario','Secondary hub')]],x.hub)}
   <label class="full" style="flex-direction:row;align-items:center;gap:8px"><input id="ape-net" type="checkbox" name="net" ${net?'checked':''}> ${t('En la red de NEXORA AIR (necesita ICAO y zona horaria)','In the NEXORA AIR network (needs ICAO and time zone)')}</label>
   <div class="full err" id="ape-err" hidden></div><div class="full" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" type="submit">${t('Guardar','Save')}</button>${btn(t('Cancelar','Cancel'),'xm','','')}</div></form>`)}
});
Object.assign(F,{
 apq:d=>{ui.apq=(d.get('q')||'').trim();ui.app=0;render()},
 ape:d=>{const key=d.get('key'),wasNet=key[0]==='N',k=key.slice(2),hub=d.get('hub')||'',lat=+d.get('lat'),lon=+d.get('lon');
   const name=(d.get('name')||'').trim(),city=(d.get('city')||'').trim(),ctry=(d.get('ctry')||'').trim(),tz=(d.get('tz')||'').trim(),icao=(d.get('icao')||'').trim().toUpperCase();
   if(!name||!city||!ctry||isNaN(lat)||isNaN(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return err('ape-err',t('Revisa los datos: nombre, ciudad, país y coordenadas son obligatorios.','Check the data: name, city, country and coordinates are required.'));
   const net=!!d.get('net')||!!hub;
   if(wasNet){const old=S.ap[k];
     if(!net){if(S.flights.some(f=>f.from===k||f.to===k))return err('ape-err',t('No se puede quitar de la red: tiene vuelos programados.','It cannot leave the network: it has scheduled flights.'));
       APX[old[0]]=[lat,lon,city,ctry,name,k,tz];S.apo[old[0]]=APX[old[0]];delete S.ap[k];rebuildIx();apRemapRT(k,old[0])}
     else{if(!tz)return err('ape-err',t('La zona horaria es obligatoria en la red.','Time zone is required in the network.'));S.ap[k]=[old[0],city,ctry,lat,lon,tz,hub,name]}
   }else{
     if(net){if(!/^[A-Z0-9]{4}$/.test(icao))return err('ape-err',t('Indica un ICAO de 4 caracteres para entrar en la red.','Enter a 4-character ICAO to join the network.'));if(S.ap[icao])return err('ape-err',t('Ese ICAO ya está en la red.','That ICAO is already in the network.'));if(!tz)return err('ape-err',t('La zona horaria es obligatoria en la red.','Time zone is required in the network.'));
       S.ap[icao]=[k,city,ctry,lat,lon,tz,hub,name];delete S.apo[k];rebuildIx();apRemapRT(k,icao)}
     else{APX[k]=[lat,lon,city,ctry,name,icao,tz];S.apo[k]=APX[k]}
   }
   aud('Editó aeropuerto',(wasNet?k:key.slice(2))+(hub?' · hub '+hub:''));done(t('Aeropuerto guardado','Airport saved'))}
});
