(function(){
  const seed = window.PANTAU_TB_SEED;
  const STORAGE_KEY = 'pantauTB_userPatients_v10_empty_start';

  // Demo-only Naive Bayes parameters. Replace with cited real-world estimates/data for final validation.
  const model = {
    prior: 0.12,
    features: {
      contact:       { tb:.45, no:.15, label:'Riwayat kontak TB' },
      cough14:       { tb:.70, no:.15, label:'Batuk ≥14 hari' },
      nightSweat:    { tb:.50, no:.12, label:'Keringat malam' },
      weightLoss:    { tb:.55, no:.10, label:'Penurunan berat badan' },
      fever:         { tb:.45, no:.12, label:'Demam berkepanjangan' },
      smoker:        { tb:.35, no:.25, label:'Merokok' },
      diabetes:      { tb:.18, no:.08, label:'Diabetes' },
      crowdHigh:     { tb:.40, no:.25, label:'Hunian padat' },
      ventilationBad:{ tb:.35, no:.20, label:'Ventilasi buruk' },
      undernutrition:{ tb:.30, no:.15, label:'Gizi kurang' },
      age50:         { tb:.40, no:.35, label:'Usia ≥50' }
    }
  };

  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const yn=v=>String(v??'').trim().toLowerCase()==='ya'||v===true||v===1;
  const toRad=x=>x*Math.PI/180;
  function haversine(lat1,lng1,lat2,lng2){
    const R=6371000;
    const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  }

  function normalizedFeatures(p){
    return {
      contact:yn(p.riwayat_kontak_tb),
      cough14:Number(p.durasi_batuk_hari||0)>=14,
      nightSweat:yn(p.keringat_malam),
      weightLoss:yn(p.penurunan_berat_badan),
      fever:yn(p.demam_berkepanjangan),
      smoker:yn(p.merokok),
      diabetes:yn(p.diabetes),
      crowdHigh:String(p.kepadatan_hunian||'').toLowerCase()==='tinggi',
      ventilationBad:String(p.ventilasi_rumah||'').toLowerCase()==='buruk',
      undernutrition:String(p.status_gizi||'').toLowerCase()==='kurang',
      age50:Number(p.umur_tahun||0)>=50
    };
  }

  function suspectProbability(p){
    const f=normalizedFeatures(p);
    let pTB=model.prior,pNo=1-model.prior;
    const evidence=[];
    for(const [key,cfg] of Object.entries(model.features)){
      const present=!!f[key];
      pTB*=present?cfg.tb:(1-cfg.tb);
      pNo*=present?cfg.no:(1-cfg.no);
      if(present)evidence.push(cfg.label);
    }
    return {probability:clamp(pTB/(pTB+pNo||1),.01,.96),evidence};
  }

  function inferEnvironment(place){
    const n=String(place.name||'').toLowerCase();
    const c=String(place.category||'').toLowerCase();
    let environment='Tertutup',crowd='Sedang',typicalDuration=60,reason='Kategori mengarah pada aktivitas dominan di dalam bangunan.';

    if(/lapangan popongan|football field/.test(n)){
      environment='Terbuka';crowd='Sedang';typicalDuration=90;reason='Nama lokasi menunjukkan lapangan luar ruang.';
    }else if(/mini soccer/.test(n)){
      environment='Semi-terbuka';crowd='Tinggi';typicalDuration=90;reason='Fasilitas olahraga diperkirakan memiliki bukaan besar namun tetap beratap.';
    }else if(c.includes('pom bensin')){
      environment='Terbuka';crowd='Rendah';typicalDuration=12;reason='Aktivitas dominan berada di area pengisian terbuka dan berdurasi singkat.';
    }else if(c==='taman'){
      environment='Semi-terbuka';crowd='Rendah';typicalDuration=60;reason='Kategori taman/joglo diperkirakan memiliki pertukaran udara tinggi.';
    }else if(/pasar kutu/.test(n)){
      environment='Semi-terbuka';crowd='Tinggi';typicalDuration=75;reason='Pasar diperkirakan padat dengan pertukaran udara parsial.';
    }else if(c.includes('pasar') && /es coklat/.test(n)){
      environment='Semi-terbuka';crowd='Sedang';typicalDuration=35;reason='Jenis usaha diperkirakan melayani pelanggan pada area terbuka/semi-terbuka.';
    }else if(c.includes('sarana rekreasi') && /gor|biliard|gedung serbaguna/.test(n)){
      environment='Tertutup';crowd='Tinggi';typicalDuration=120;reason='Nama lokasi menunjukkan aktivitas berkumpul di fasilitas dalam ruang.';
    }else if(c.includes('sekolah')){
      environment='Tertutup';crowd='Tinggi';typicalDuration=240;reason='Aktivitas belajar umumnya berlangsung lama di ruang kelas.';
    }else if(c.includes('club')){
      environment='Tertutup';crowd='Tinggi';typicalDuration=180;reason='Aktivitas berkerumun diperkirakan berlangsung lama di dalam ruang.';
    }else if(c.includes('rumah makan')){
      environment='Tertutup';crowd='Sedang';typicalDuration=75;reason='Kategori rumah makan/kafe diasumsikan dominan memiliki area dalam ruang.';
    }else if(c.includes('tempat ibadah')){
      environment='Tertutup';crowd='Sedang';typicalDuration=75;reason='Aktivitas berkumpul umumnya terjadi di bangunan utama.';
    }else if(c.includes('puskesmas')||c.includes('apotek')){
      environment='Tertutup';crowd='Sedang';typicalDuration=45;reason='Pelayanan kesehatan/apotek umumnya berlangsung di dalam bangunan.';
    }else if(c.includes('bank')){
      environment='Tertutup';crowd='Sedang';typicalDuration=35;reason='Pelayanan nasabah umumnya berlangsung di dalam bangunan.';
    }else if(c.includes('pasar')){
      environment='Tertutup';crowd='Sedang';typicalDuration=45;reason='Kategori toko/layanan komersial diasumsikan dominan berada di dalam bangunan.';
    }else if(c.includes('sarana rekreasi')){
      environment='Semi-terbuka';crowd='Sedang';typicalDuration=90;reason='Jenis sarana rekreasi tidak cukup spesifik; diasumsikan semi-terbuka sampai diverifikasi.';
    }

    const envMultiplier={Terbuka:.48,'Semi-terbuka':.78,Tertutup:1.0}[environment];
    const crowdMultiplier={Rendah:.70,Sedang:.90,Tinggi:1.15}[crowd];
    return {environment,crowd,typicalDuration,envMultiplier,crowdMultiplier,reason};
  }

  // Deployment starts empty: no patient/suspect records are preloaded.
  // Boundary and public-place coordinates remain available as map infrastructure.
  function seedPatients(){ return []; }
  function getUserPatients(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch(_){return []}}
  function saveUserPatients(list){localStorage.setItem(STORAGE_KEY,JSON.stringify(list))}
  function addPatient(patient){const list=getUserPatients();list.push(patient);saveUserPatients(list);return patient}
  function reset(){localStorage.removeItem(STORAGE_KEY)}
  function allPatients(){return [...seedPatients(),...getUserPatients()]}

  function boundaryLatLng(){return seed.boundary.map(p=>[Number(p.lat),Number(p.lng)])}
  function center(){const pts=seed.boundary;return [pts.reduce((s,p)=>s+Number(p.lat),0)/pts.length,pts.reduce((s,p)=>s+Number(p.lng),0)/pts.length]}

  // Ray-casting point-in-polygon. lng = x-axis, lat = y-axis.
  function insideBoundary(lat,lng){
    const poly=seed.boundary.map(p=>[Number(p.lng),Number(p.lat)]);
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
      const intersect=((yi>lat)!=(yj>lat)) && (lng < (xj-xi)*(lat-yi)/(yj-yi||1e-12)+xi);
      if(intersect)inside=!inside;
    }
    return inside;
  }

  function parseDateOnlyUTC(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));
  }
  function daysSinceDate(value,now=new Date()){
    const t=parseDateOnlyUTC(value);
    if(t==null)return null;
    const nowUTC=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
    return Math.max(0,(nowUTC-t)/86400000);
  }
  // Operational DEMO recency weight for the user-requested 7-day visit-history window.
  // This is not a TB quarantine rule and not a biologic aerosol-decay model.
  function visitRecencyWeight(value){
    const days=daysSinceDate(value);
    if(days==null)return .55; // missing date: conservative demo weight
    if(days>=7)return 0;
    return Math.max(0,1-days/7);
  }

  function publicRisk(place){
    const info=inferEnvironment(place);
    const patients=allPatients();

    // Nearby suspect signal: attention score only, not transmission probability.
    // It is deliberately local to the public place so distant suspects do not color it.
    let weighted=0,weights=0;
    for(const p of patients.filter(x=>x.status==='suspect')){
      const d=haversine(Number(p.lat),Number(p.lng),Number(place.lat),Number(place.lng));
      if(d<=120){
        const w=Math.exp(-d/45);
        const probability=p.risk_probability!=null?Number(p.risk_probability):suspectProbability(p).probability;
        weighted+=probability*w;weights+=w;
      }
    }
    const nearbySignal=weights?weighted/weights:0;
    const background=clamp(nearbySignal*.18,0,.16);

    // Confirmed-visit signal from explicit recent location history.
    // Seven days is an OPERATIONAL DEMO window requested for the UI, not a TB
    // quarantine threshold. Older visits are down-weighted and reach zero at day 7.
    let noVisitEvent=1;
    let freshestDays=null;
    for(const p of patients.filter(x=>x.status==='confirmed')){
      for(const v of (p.travel||[]).filter(v=>v.placeName===place.name)){
        const recency=visitRecencyWeight(v.date);
        if(recency<=0)continue;
        const d=daysSinceDate(v.date);
        if(d!=null && (freshestDays==null || d<freshestDays))freshestDays=d;
        const durationFactor=clamp(Number(v.duration||60)/60,.20,3.0);
        const infectiousFactor=p.infectious==='Tidak'?.20:p.infectious==='Belum diketahui'?.65:1;
        const event=clamp(.14*info.envMultiplier*info.crowdMultiplier*durationFactor*infectiousFactor*recency,.005,.74);
        noVisitEvent*=1-event;
      }
    }
    const visitSignal=1-noVisitEvent;
    const score=clamp(1-(1-background)*(1-visitSignal),0,.92);
    return {...info,score:Math.round(score*100),background,visitSignal,freshestDays};
  }

  function placeRisks(){return seed.places.filter(p=>insideBoundary(Number(p.lat),Number(p.lng))).map(p=>({...p,...publicRisk(p)})).sort((a,b)=>b.score-a.score)}
  function riskLabel(score){
    const s=Number(score)||0;
    if(s>=80)return 'Sangat tinggi';
    if(s>=65)return 'Tinggi';
    if(s>=55)return 'Sedang';
    if(s>=45)return 'Waspada';
    if(s>=35)return 'Rendah';
    return 'Sangat rendah';
  }
  function maskNIK(value){const v=String(value||'');return v.length<=5?v:`••••••${v.slice(-4)}`}
  function fmtPct(v){return `${Math.round(Number(v)*100)}%`}



  function riskBand(score){
    const s=Number(score)||0;
    if(s>=80)return {label:'Sangat tinggi',color:'#780000'};
    if(s>=65)return {label:'Tinggi',color:'#C1121F'};
    if(s>=55)return {label:'Sedang',color:'#E86554'};
    if(s>=45)return {label:'Waspada',color:'#F79D8B'};
    if(s>=35)return {label:'Rendah',color:'#FBD3C9'};
    if(s>=20)return {label:'Sangat rendah',color:'#FDF0D5'};
    return {label:'Tidak ditampilkan',color:'transparent'};
  }

  function polygonSignedArea(poly){
    let a=0;
    for(let i=0;i<poly.length;i++){
      const [x1,y1]=poly[i], [x2,y2]=poly[(i+1)%poly.length];
      a+=x1*y2-x2*y1;
    }
    return a/2;
  }

  function lineIntersection(p1,p2,a,b){
    const x1=p1[0],y1=p1[1],x2=p2[0],y2=p2[1];
    const x3=a[0],y3=a[1],x4=b[0],y4=b[1];
    const den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
    if(Math.abs(den)<1e-12)return p2;
    const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/den;
    return [x1+t*(x2-x1),y1+t*(y2-y1)];
  }

  // Sutherland-Hodgman clipping for the convex four-point KAPITU boundary.
  function clipToBoundary(subject){
    const clip=seed.boundary.map(p=>[Number(p.lng),Number(p.lat)]);
    const orientation=polygonSignedArea(clip)>=0?1:-1;
    const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
    const inside=(p,a,b)=>orientation*cross(a,b,p)>=-1e-12;
    let output=subject.slice();
    for(let i=0;i<clip.length;i++){
      const a=clip[i],b=clip[(i+1)%clip.length];
      const input=output.slice();output=[];
      if(!input.length)break;
      let s=input[input.length-1];
      for(const e of input){
        const ein=inside(e,a,b),sin=inside(s,a,b);
        if(ein){
          if(!sin)output.push(lineIntersection(s,e,a,b));
          output.push(e);
        }else if(sin){
          output.push(lineIntersection(s,e,a,b));
        }
        s=e;
      }
    }
    return output;
  }

  function polygonCentroid(poly){
    if(!poly.length)return [0,0];
    let sx=0,sy=0;
    for(const p of poly){sx+=p[0];sy+=p[1]}
    return [sx/poly.length,sy/poly.length];
  }

  // Fixed geographic ANALYSIS BANDWIDTHS (meters). These are visualization/model
  // parameters, NOT clinical TB transmission distances. TB risk is driven by shared
  // air, ventilation, infectiousness, duration/frequency, and proximity; there is no
  // universal evidence-based meter radius. Keeping these bandwidths fixed in meters
  // makes the display geographically stable across zoom levels.
  const SPATIAL_RADII={confirmed:42,suspect:30,place:36};

  // Smooth compact-support kernel: influence is exactly zero outside radius R.
  // This keeps each indicated area small and geographically stable.
  function compactWeight(distance,radius){
    if(distance>=radius)return 0;
    const x=1-distance/radius;
    return x*x*(3-2*x); // smoothstep-shaped falloff
  }

  function spatialRiskAt(lat,lng,patients,risks){
    let survival=1;
    let confirmedNearby=0,suspectNearby=0;

    for(const p of patients){
      const plat=Number(p.lat),plng=Number(p.lng);
      if(!Number.isFinite(plat)||!Number.isFinite(plng))continue;
      const d=haversine(lat,lng,plat,plng);
      if(p.status==='confirmed'){
        if(d<=SPATIAL_RADII.confirmed)confirmedNearby++;
        const infectiousFactor=p.infectious==='Tidak'?.20:p.infectious==='Belum diketahui'?.65:1;
        const w=compactWeight(d,SPATIAL_RADII.confirmed);
        const contribution=clamp(.78*w*infectiousFactor,0,.80);
        survival*=1-contribution;
      }else{
        if(d<=SPATIAL_RADII.suspect)suspectNearby++;
        const pr=p.risk_probability!=null?Number(p.risk_probability):suspectProbability(p).probability;
        const w=compactWeight(d,SPATIAL_RADII.suspect);
        const contribution=clamp(pr*.50*w,0,.48);
        survival*=1-contribution;
      }
    }

    // Public-place exposure contributes around the place itself. The place score can
    // include recent confirmed visits, environment/crowding, and nearby suspect signal.
    for(const place of risks){
      const d=haversine(lat,lng,Number(place.lat),Number(place.lng));
      const w=compactWeight(d,SPATIAL_RADII.place);
      const contribution=clamp((place.score/100)*.58*w,0,.55);
      survival*=1-contribution;
    }

    const score=Math.round(clamp((1-survival)*100,0,96));
    return {score,confirmedNearby,suspectNearby,radii:SPATIAL_RADII,...riskBand(score)};
  }

  // Creates a choropleth-like grid clipped to the supplied KAPITU edge polygon.
  // Cells are model zones, not administrative boundaries.
  function spatialZones(cols=9,rows=12){
    const boundary=seed.boundary;
    const minLat=Math.min(...boundary.map(p=>Number(p.lat))),maxLat=Math.max(...boundary.map(p=>Number(p.lat)));
    const minLng=Math.min(...boundary.map(p=>Number(p.lng))),maxLng=Math.max(...boundary.map(p=>Number(p.lng)));
    const dLat=(maxLat-minLat)/rows,dLng=(maxLng-minLng)/cols;
    const patients=allPatients().filter(p=>insideBoundary(Number(p.lat),Number(p.lng)));
    const risks=placeRisks();
    const zones=[];
    let idx=1;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const y0=minLat+r*dLat,y1=minLat+(r+1)*dLat;
        const x0=minLng+c*dLng,x1=minLng+(c+1)*dLng;
        const clipped=clipToBoundary([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
        if(clipped.length<3)continue;
        const [cx,cy]=polygonCentroid(clipped);
        const risk=spatialRiskAt(cy,cx,patients,risks);
        zones.push({
          id:`Z${String(idx++).padStart(2,'0')}`,
          polygon:clipped.map(([x,y])=>[y,x]),
          lat:cy,lng:cx,
          ...risk
        });
      }
    }
    return zones;
  }

  function toast(message){
    const el=document.getElementById('toast')||document.querySelector('.toast');
    if(!el)return;
    el.textContent=message;el.classList.add('show');
    clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),2600);
  }
  function setActiveNav(){
    const page=document.body.dataset.page;
    document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===page));
  }

  window.PTB={seed,model,yn,clamp,haversine,normalizedFeatures,suspectProbability,inferEnvironment,seedPatients,getUserPatients,saveUserPatients,addPatient,reset,allPatients,boundaryLatLng,center,insideBoundary,parseDateOnlyUTC,daysSinceDate,visitRecencyWeight,publicRisk,placeRisks,riskLabel,riskBand,SPATIAL_RADII,compactWeight,spatialRiskAt,spatialZones,maskNIK,fmtPct,toast,setActiveNav};
  document.addEventListener('DOMContentLoaded',setActiveNav);
})();
