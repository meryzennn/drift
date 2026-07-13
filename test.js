fetch('https://www.facebook.com/share/r/1BgpyPmXhu/', {headers:{'User-Agent':'facebookexternalhit/1.1'}})
  .then(r=>r.text())
  .then(t => {
    const w = t.match(/og:video:width[^>]*content=["'](\d+)["']/i);
    const h = t.match(/og:video:height[^>]*content=["'](\d+)["']/i);
    const iw = t.match(/og:image:width[^>]*content=["'](\d+)["']/i);
    const ih = t.match(/og:image:height[^>]*content=["'](\d+)["']/i);
    console.log("Video W/H:", w?.[1], h?.[1]);
    console.log("Image W/H:", iw?.[1], ih?.[1]);
  });
