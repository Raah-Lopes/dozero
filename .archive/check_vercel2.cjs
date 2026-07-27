fetch('https://dozero-vert.vercel.app/')
  .then(r => r.text())
  .then(h => {
    const m = h.match(/src="(\/assets\/index-[^\"]+\.js)"/);
    fetch('https://dozero-vert.vercel.app' + m[1])
      .then(r => r.text())
      .then(j => {
        console.log("90vh exists: ", j.includes('90vh'));
        console.log("flex-col gap-2 exists: ", j.includes('flex-col gap-2 mt-4'));
      });
  });
