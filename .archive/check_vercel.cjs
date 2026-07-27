fetch('https://dozero-vert.vercel.app/')
  .then(r => r.text())
  .then(h => {
    const m = h.match(/src="(\/assets\/index-[^\"]+\.js)"/);
    if (!m) return console.log('no js file found');
    fetch('https://dozero-vert.vercel.app' + m[1])
      .then(r => r.text())
      .then(j => {
        console.log(j.includes('Sincronizar Nuvem') ? 'VERCEL IS UPDATED' : 'VERCEL IS OLD');
      });
  });
