document.addEventListener('DOMContentLoaded',()=>{
  const {PTB}=window;
  const table=document.getElementById('recordTable');
  const search=document.getElementById('search');
  function render(){
    const all=PTB.allPatients();
    const q=String(search.value||'').toLowerCase();
    const rows=all.filter(p=>`${p.id||''} ${p.nik||''}`.toLowerCase().includes(q));
    const confirmed=all.filter(p=>p.status==='confirmed').length;
    const suspect=all.length-confirmed;
    document.getElementById('recordStats').innerHTML=`<span class="record-stat"><strong>${all.length}</strong> total</span><span class="record-stat"><strong>${confirmed}</strong> terkonfirmasi</span><span class="record-stat"><strong>${suspect}</strong> suspek</span><span class="record-stat"><strong>${all.filter(p=>p.source==='user').length}</strong> input tambahan</span>`;
    table.innerHTML=`<div class="record-row record-head"><span>ID / NIK</span><span>Status</span><span>Probabilitas</span><span>Umur</span><span>JK</span><span>Tes / evidence</span><span>Sumber</span></div>`+rows.map(p=>{
      const pr=p.status==='suspect'?(p.risk_probability!=null?Number(p.risk_probability):PTB.suspectProbability(p).probability):null;
      const label=p.source==='user'?PTB.maskNIK(p.nik):(p.id||'-');
      const detail=p.status==='confirmed'?(p.testType||'Tidak dicantumkan'):PTB.suspectProbability(p).evidence.slice(0,2).join(', ')||'Tidak ada evidence aktif';
      return `<div class="record-row"><strong>${label}</strong><span><i class="status-chip ${p.status}">${p.status==='confirmed'?'Terkonfirmasi':'Suspek'}</i></span><span>${pr==null?'—':Math.round(pr*100)+'%'}</span><span>${p.umur_tahun||'-'}</span><span>${p.jenis_kelamin||'-'}</span><span>${detail}</span><span><i class="source-chip">Input web</i></span></div>`;
    }).join('') + (rows.length===0 ? '<div class="empty-registry"><strong>Belum ada data orang.</strong><span>Tambahkan suspek atau kasus terkonfirmasi dari Peta Utama untuk memulai demonstrasi.</span></div>' : '');
  }
  search.addEventListener('input',render);render();
});
