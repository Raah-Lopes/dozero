fetch('https://dozero-vert.vercel.app/')
  .then(r => r.text())
  .then(h => {
    const m = h.match(/href="(\/assets\/index-[^\"]+\.css)"/);
    if (!m) return console.log('no css');
    fetch('https://dozero-vert.vercel.app' + m[1])
      .then(r => r.text())
      .then(c => {
        console.log("CSS length:", c.length);
      });
  });
