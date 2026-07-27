fetch('https://dozero.vercel.app/')
  .then(r => r.text())
  .then(h => {
    const m = h.match(/src="(\/assets\/index-[^\"]+\.js)"/);
    if (!m) {
      console.log('no js file found on dozero.vercel.app');
      return;
    }
    fetch('https://dozero.vercel.app' + m[1])
      .then(r => r.text())
      .then(j => {
        console.log("90vh exists on dozero.vercel.app: ", j.includes('90vh'));
      });
  })
  .catch(e => console.log('error', e.message));
