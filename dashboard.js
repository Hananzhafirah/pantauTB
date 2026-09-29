document.addEventListener('DOMContentLoaded',()=>{
  const {PTB,L}=window;
  const modal=document.getElementById('personModal');
  const form=document.getElementById('personForm');
  let status='suspect';
  let travel=[];
  let pickMode=false;
  let selectedMarker=null;
  let currentPatients=[];
  let currentRisks=[];

  const map=L.map('map',{zoomControl:true,attributionControl:true,preferCanvas:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© OpenStreetMap',
    className:'muted-map-tiles'
  }).addTo(map);

  map.createPane('heatPane');
  map.getPane('heatPane').style.zIndex=330;
  map.getPane('heatPane').style.pointerEvents='none';
  map.createPane('maskPane');
  map.getPane('maskPane').style.zIndex=360;
  map.getPane('maskPane').style.pointerEvents='none';
  map.createPane('boundaryPane');
  map.getPane('boundaryPane').style.zIndex=470;
  map.getPane('boundaryPane').style.pointerEvents='none';

  const layers={
    risk:L.layerGroup().addTo(map),
    placeRadius:L.layerGroup().addTo(map),
    places:L.layerGroup().addTo(map),
    confirmed:L.layerGroup().addTo(map),
    suspect:L.layerGroup().addTo(map),
    boundary:L.layerGroup().addTo(map)
  };

  const boundaryLatLng=PTB.boundaryLatLng();
  // Lightly dim everything outside KAPITU so the supplied edge is easy to read.
  const world=[[-85,-180],[-85,180],[85,180],[85,-180]];
  L.polygon([world,boundaryLatLng.slice().reverse()],{
    pane:'maskPane',stroke:false,fillColor:'#F8FBFC',fillOpacity:.55,interactive:false
  }).addTo(layers.boundary);

  const boundary=L.polygon(boundaryLatLng,{
    pane:'boundaryPane',color:'#003049',weight:5.5,opacity:1,fill:false,lineCap:'round',lineJoin:'round',interactive:false
  }).addTo(layers.boundary);
  map.fitBounds(boundary.getBounds(),{padding:[18,18],maxZoom:17});

  function publicIcon(score){
    const band=PTB.riskBand(score);
    const textColor=score>=55?'#FFFFFF':'#5B1720';
    const haloColor=score<=0?'#EAF2F5':(band.color==='transparent'?'#FDF0D5':band.color);
    return L.divIcon({
      className:'',
      html:`<div class="google-pin-wrap" style="--risk:${haloColor}">
        <svg class="google-pin" viewBox="0 0 34 46" aria-hidden="true">
          <path d="M17 1.5C8.45 1.5 1.5 8.45 1.5 17c0 11.15 15.5 27.5 15.5 27.5S32.5 28.15 32.5 17C32.5 8.45 25.55 1.5 17 1.5Z" fill="#003049" stroke="#FFFFFF" stroke-width="2.5"/>
          <circle cx="17" cy="17" r="6.2" fill="#FFFFFF"/>
          <circle cx="17" cy="17" r="3.1" fill="#669BBC"/>
        </svg>
        <span class="pin-risk-badge" style="background:${haloColor};color:${textColor}">${Math.round(score)}%</span>
      </div>`,
      iconSize:[44,52],iconAnchor:[17,45],popupAnchor:[0,-43],tooltipAnchor:[0,-39]
    });
  }

  function patientIcon(status){
    const confirmed=status==='confirmed';
    return L.divIcon({
      className:'',
      html:`<div class="patient-dot ${confirmed?'confirmed':'suspect'}"><span></span></div>`,
      iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-12],tooltipAnchor:[0,-12]
    });
  }

  function riskPopup(lat,lng){
    const r=PTB.spatialRiskAt(lat,lng,currentPatients,currentRisks);
    return `<div class="popup-card"><div class="popup-kicker">Estimasi risiko spasial</div><div class="popup-title">${r.score===0?'Belum ada sinyal risiko':r.label}</div><div class="zone-score">${r.score}<small>/100</small></div><div class="popup-meta">Terkonfirmasi dalam bandwidth ${PTB.SPATIAL_RADII.confirmed} m: <strong>${r.confirmedNearby}</strong><br>Suspek dalam bandwidth ${PTB.SPATIAL_RADII.suspect} m: <strong>${r.suspectNearby}</strong></div><span class="popup-risk">Indeks pemantauan model, bukan probabilitas penularan klinis</span></div>`;
  }

  // Risk surface is computed in GEOGRAPHIC coordinates (meters through PTB.spatialRiskAt)
  // and rasterized once into the supplied KAPITU bounds. Leaflet then only scales the
  // same image while zooming, so the indicated geographic area does NOT change with zoom.
  function riskSurfaceDataUrl(patients,risks){
    const boundaryPts=PTB.seed.boundary;
    const minLat=Math.min(...boundaryPts.map(p=>Number(p.lat)));
    const maxLat=Math.max(...boundaryPts.map(p=>Number(p.lat)));
    const minLng=Math.min(...boundaryPts.map(p=>Number(p.lng)));
    const maxLng=Math.max(...boundaryPts.map(p=>Number(p.lng)));

    // FIXED GEOGRAPHIC GRID: each raster cell represents ~8 meters on the ground.
    // It is created only when the data change. Zoom/pan only scales the same overlay.
    const GRID_METERS=5;
    const midLat=(minLat+maxLat)/2;
    const geoWidth=PTB.haversine(midLat,minLng,midLat,maxLng);
    const geoHeight=PTB.haversine(minLat,minLng,maxLat,minLng);
    const width=Math.max(80,Math.round(geoWidth/GRID_METERS));
    const height=Math.max(100,Math.round(geoHeight/GRID_METERS));

    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:false});
    const img=ctx.createImageData(width,height);
    const data=img.data;

    // Explicit bands make every meaningful score visible. In particular,
    // 51% falls in the 45–54 band and is deliberately rendered salmon/orange.
    const styleFor=(score)=>{
      const s=Math.max(0,Math.min(100,Number(score)||0));
      if(s<20)return {rgb:[253,240,213],alpha:0};
      if(s<35)return {rgb:[253,240,213],alpha:72};      // 20–34
      if(s<45)return {rgb:[251,211,201],alpha:105};     // 35–44
      if(s<55)return {rgb:[247,157,139],alpha:158};     // 45–54 (51% clearly visible)
      if(s<65)return {rgb:[232,101,84],alpha:174};      // 55–64
      if(s<80)return {rgb:[193,18,31],alpha:188};       // 65–79
      return {rgb:[120,0,0],alpha:205};                 // 80–100
    };

    for(let py=0;py<height;py++){
      const lat=maxLat-(py+0.5)/height*(maxLat-minLat);
      for(let px=0;px<width;px++){
        const lng=minLng+(px+0.5)/width*(maxLng-minLng);
        const i=(py*width+px)*4;
        if(!PTB.insideBoundary(lat,lng)){
          data[i+3]=0;
          continue;
        }
        const score=PTB.spatialRiskAt(lat,lng,patients,risks).score;
        const st=styleFor(score);
        data[i]=st.rgb[0];data[i+1]=st.rgb[1];data[i+2]=st.rgb[2];data[i+3]=st.alpha;
      }
    }
    ctx.putImageData(img,0,0);
    return {url:canvas.toDataURL('image/png'),bounds:[[minLat,minLng],[maxLat,maxLng]],gridMeters:GRID_METERS};
  }

  function renderMap(){
    layers.risk.clearLayers();
    layers.placeRadius.clearLayers();
    layers.places.clearLayers();
    layers.confirmed.clearLayers();
    layers.suspect.clearLayers();

    currentPatients=PTB.allPatients().filter(p=>PTB.insideBoundary(Number(p.lat),Number(p.lng)));
    currentRisks=PTB.placeRisks();

    // One fixed geographic risk surface. Zooming changes only display scale,
    // never the underlying risk footprint.
    const surface=riskSurfaceDataUrl(currentPatients,currentRisks);
    L.imageOverlay(surface.url,surface.bounds,{
      pane:'heatPane',
      opacity:1,
      interactive:false,
      crossOrigin:false,
      className:'risk-surface-overlay'
    }).addTo(layers.risk);

    currentRisks.forEach(place=>{
      const band=PTB.riskBand(place.score);
      const placeColor=band.color==='transparent'?'#F6C7BE':band.color;
      if(place.score>0){
        L.circle([place.lat,place.lng],{
          radius:PTB.SPATIAL_RADII.place,
          color:placeColor,
          weight:2.2,
          opacity:.92,
          fillColor:placeColor,
          fillOpacity:Math.max(.16,Math.min(.18+place.score/220,.48)),
          interactive:false,
          className:'public-risk-radius'
        }).addTo(layers.placeRadius);
      }
      const recency=place.freshestDays==null?'Belum ada kunjungan terkonfirmasi 7 hari':`Kunjungan terkonfirmasi terbaru: ${Math.floor(place.freshestDays)} hari lalu`;
      L.marker([place.lat,place.lng],{icon:publicIcon(place.score),zIndexOffset:980})
        .bindTooltip(`${place.name} · risiko ${place.score}%`,{direction:'top',offset:[0,-38],opacity:.97,className:'place-tooltip'})
        .bindPopup(`<div class="popup-card"><div class="popup-kicker">Lokasi publik</div><div class="popup-title">${place.name}</div><div class="zone-score place-score">${place.score}<small>/100</small></div><div class="popup-meta">${place.category}<br>Estimasi ruang: ${place.environment}<br>Kepadatan: ${place.crowd}<br>${recency}</div><span class="popup-risk">Radius berwarna = indeks lokasi pada bandwidth ${PTB.SPATIAL_RADII.place} m</span></div>`)
        .addTo(layers.places);
    });

    // Tampilkan kembali titik individu agar overlap sumber risiko terlihat saat demo.
    // Confirmed = merah pekat, suspect = oranye.
    currentPatients.forEach(p=>{
      const isConfirmed=p.status==='confirmed';
      const layer=isConfirmed?layers.confirmed:layers.suspect;
      const label=isConfirmed?'TB terkonfirmasi':'Suspek';
      const extra=isConfirmed
        ? `Tes: ${p.testType||'Tidak dicantumkan'}${p.infectious?`<br>Status infeksius: ${p.infectious}`:''}`
        : `Probabilitas model: ${Math.round(Number(p.risk_probability ?? PTB.suspectProbability(p).probability)*100)}%`;
      L.marker([Number(p.lat),Number(p.lng)],{icon:patientIcon(p.status),zIndexOffset:isConfirmed?1280:1200})
        .bindTooltip(`${label} · ${PTB.maskNIK(p.nik||p.id||p.id_pasien||'')}`,{direction:'top',opacity:.96,className:'person-tooltip'})
        .bindPopup(`<div class="popup-card"><div class="popup-kicker">${label}</div><div class="popup-title">${PTB.maskNIK(p.nik||p.id||p.id_pasien||'')}</div><div class="popup-meta">Umur: ${p.umur_tahun||'-'}<br>Jenis kelamin: ${p.jenis_kelamin||'-'}<br>${extra}</div><span class="popup-risk">Titik individu ditampilkan untuk demonstrasi overlap model.</span></div>`)
        .addTo(layer);
    });


    const sampleZones=PTB.spatialZones(11,15);
    const maxPoint=currentPatients.length ? sampleZones.slice().sort((a,b)=>b.score-a.score)[0] : null;
    const confirmed=currentPatients.filter(p=>p.status==='confirmed').length;
    const suspect=currentPatients.length-confirmed;
    document.getElementById('kpiConfirmed').textContent=confirmed;
    document.getElementById('kpiSuspects').textContent=suspect;
    document.getElementById('kpiPlaces').textContent=currentRisks.length;
    document.getElementById('kpiMaxRisk').textContent=(maxPoint?.score||0)+'/100';
    document.getElementById('maxRiskName').textContent=maxPoint?`${maxPoint.label} · area model tertinggi`:'Belum ada data individu';

    document.getElementById('riskList').innerHTML=currentRisks.slice(0,8).map(p=>`<div class="risk-item"><div class="risk-score">${p.score}%</div><div><div class="risk-name">${p.name}</div><div class="risk-meta">${p.environment} · ${p.category}<br>${p.reason}</div></div><span class="risk-tag">${PTB.riskLabel(p.score)}</span></div>`).join('');
  }

  renderMap();

  document.querySelectorAll('[data-layer]').forEach(cb=>cb.addEventListener('change',()=>{
    const key=cb.dataset.layer;
    cb.checked?layers[key].addTo(map):map.removeLayer(layers[key]);
  }));

  function openModal(){modal.classList.remove('hidden');document.body.classList.add('modal-open');updateProbability()}
  function closeModal(){modal.classList.add('hidden');document.body.classList.remove('modal-open')}
  document.getElementById('openAddPerson').addEventListener('click',openModal);
  document.querySelectorAll('[data-close-modal]').forEach(el=>el.addEventListener('click',closeModal));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(pickMode){stopPickMode()}else if(!modal.classList.contains('hidden'))closeModal()}});
  if(location.hash==='#add')setTimeout(openModal,100);

  function setStatus(next){
    status=next;
    document.querySelectorAll('.status-tab').forEach(b=>b.classList.toggle('active',b.dataset.status===status));
    document.getElementById('suspectFields').classList.toggle('hidden',status!=='suspect');
    document.getElementById('confirmedFields').classList.toggle('hidden',status!=='confirmed');
    updateProbability();
  }
  document.querySelectorAll('.status-tab').forEach(b=>b.addEventListener('click',()=>setStatus(b.dataset.status)));

  function val(id){return document.getElementById(id)?.value??''}
  function currentSuspect(){return {
    umur_tahun:Number(val('age')||0),jenis_kelamin:val('gender'),riwayat_kontak_tb:val('contact'),durasi_batuk_hari:Number(val('coughDays')||0),
    keringat_malam:val('nightSweat'),penurunan_berat_badan:val('weightLoss'),demam_berkepanjangan:val('fever'),merokok:val('smoker'),diabetes:val('diabetes'),
    kepadatan_hunian:val('crowding'),ventilasi_rumah:val('ventilation'),status_gizi:val('nutrition')
  }}
  function updateProbability(){
    if(status!=='suspect')return;
    const r=PTB.suspectProbability(currentSuspect());
    const pct=Math.round(r.probability*100);
    document.getElementById('probRing').style.setProperty('--p',pct+'%');
    document.querySelector('#probRing span').textContent=pct+'%';
    document.getElementById('probEvidence').textContent=r.evidence.length?`Evidence aktif: ${r.evidence.slice(0,5).join(', ')}${r.evidence.length>5?'…':''}`:'Isi data skrining untuk memperbarui estimasi.';
  }
  form.addEventListener('input',updateProbability);

  const placeOptions=PTB.seed.places.filter(p=>PTB.insideBoundary(Number(p.lat),Number(p.lng))).map(p=>`<option value="${String(p.name).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${p.name}</option>`).join('');
  function renderTravel(){
    const el=document.getElementById('travelList');
    el.innerHTML=travel.map((v,i)=>`<div class="travel-row"><label class="field"><span>Lokasi publik</span><select data-travel="${i}" data-key="placeName">${placeOptions}</select></label><label class="field"><span>Tanggal</span><input type="date" data-travel="${i}" data-key="date" value="${v.date||''}"></label><label class="field"><span>Durasi (menit)</span><input type="number" min="5" step="5" data-travel="${i}" data-key="duration" value="${v.duration||60}"></label><button type="button" class="travel-remove" data-remove="${i}">×</button></div>`).join('');
    travel.forEach((v,i)=>{const s=el.querySelector(`select[data-travel="${i}"]`);if(s)s.value=v.placeName});
    el.querySelectorAll('[data-travel]').forEach(x=>x.addEventListener('change',()=>{travel[Number(x.dataset.travel)][x.dataset.key]=x.value}));
    el.querySelectorAll('[data-remove]').forEach(x=>x.addEventListener('click',()=>{travel.splice(Number(x.dataset.remove),1);renderTravel()}));
  }
  document.getElementById('addTravel').addEventListener('click',()=>{
    travel.push({placeName:PTB.seed.places[0]?.name||'',date:new Date().toISOString().slice(0,10),duration:60});renderTravel();
  });

  function startPickMode(){
    closeModal();pickMode=true;document.getElementById('pickBanner').classList.remove('hidden');map.getContainer().style.cursor='crosshair';
  }
  function stopPickMode(){pickMode=false;document.getElementById('pickBanner').classList.add('hidden');map.getContainer().style.cursor='';}
  document.getElementById('pickOnMap').addEventListener('click',startPickMode);
  map.on('click',e=>{
    const {lat,lng}=e.latlng;
    if(pickMode){
      if(!PTB.insideBoundary(lat,lng)){PTB.toast('Titik berada di luar batas KAPITU. Pilih lokasi di dalam garis biru.');return;}
      document.getElementById('lat').value=lat.toFixed(6);document.getElementById('lng').value=lng.toFixed(6);
      if(selectedMarker)selectedMarker.remove();
      selectedMarker=L.circleMarker([lat,lng],{radius:8,color:'#FFFFFF',weight:3,fillColor:status==='confirmed'?'#780000':'#D96A13',fillOpacity:1}).addTo(map);
      stopPickMode();openModal();PTB.toast('Lokasi dipilih.');
      return;
    }
    if(PTB.insideBoundary(lat,lng)){
      L.popup({maxWidth:290,closeButton:true}).setLatLng([lat,lng]).setContent(riskPopup(lat,lng)).openOn(map);
    }
  });

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const nik=String(val('nik')).trim(),lat=Number(val('lat')),lng=Number(val('lng'));
    if(!nik){PTB.toast('NIK / ID pasien wajib diisi.');return}
    if(!Number.isFinite(lat)||!Number.isFinite(lng)){PTB.toast('Pilih lokasi pada peta atau isi koordinat.');return}
    if(!PTB.insideBoundary(lat,lng)){PTB.toast('Koordinat berada di luar batas KAPITU.');return}

    const base={id:'USR-'+Date.now(),nik,status,lat,lng,umur_tahun:Number(val('age')||0),jenis_kelamin:val('gender'),source:'user',createdAt:new Date().toISOString()};
    let patient;
    if(status==='confirmed'){
      if(!val('testType')){PTB.toast('Pilih metode tes/konfirmasi TB.');return}
      patient={...base,testType:val('testType'),diagnosisDate:val('diagnosisDate'),infectious:val('infectious'),travel:travel.map(v=>({...v,duration:Number(v.duration||60)}))};
    }else{
      const s=currentSuspect(),r=PTB.suspectProbability(s);
      patient={...base,...s,risk_probability:r.probability,travel:[]};
    }
    const savedStatus=status;
    PTB.addPatient(patient);
    closeModal();
    if(selectedMarker){selectedMarker.remove();selectedMarker=null}
    form.reset();travel=[];renderTravel();setStatus('suspect');renderMap();
    PTB.toast(savedStatus==='confirmed'?'Kasus terkonfirmasi ditambahkan dan peta diperbarui.':'Suspek ditambahkan dan peta risiko diperbarui.');
  });

  document.getElementById('resetData').addEventListener('click',()=>{
    if(confirm('Hapus seluruh data orang yang sudah ditambahkan? Peta akan kembali ke kondisi awal dengan risiko lokasi 0%.')){PTB.reset();travel=[];renderTravel();renderMap();PTB.toast('Data direset. Peta kembali kosong.');}
  });
});
