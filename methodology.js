document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('environmentTable');
  if (!el) return;

  const PTB = window.PTB;

  if (!PTB || !PTB.seed || !Array.isArray(PTB.seed.places)) {
    el.innerHTML = '<p>Data lokasi publik belum tersedia.</p>';
    return;
  }

  const places = PTB.seed.places
    .filter((p) => PTB.insideBoundary(Number(p.lat), Number(p.lng)));

  if (!places.length) {
    el.innerHTML = '<p>Belum ada lokasi publik di dalam batas pemantauan.</p>';
    return;
  }

  el.innerHTML = places.map((p) => {
    const info = PTB.inferEnvironment(p);

    return `
      <article class="environment-item">
        <strong>${p.name}</strong>
        <span>${p.category || 'Lokasi publik'}</span>
        <span class="environment-pill">
          ${info.environment} · ${info.crowd}
        </span>
        <span>${info.reason}</span>
      </article>
    `;
  }).join('');
});
