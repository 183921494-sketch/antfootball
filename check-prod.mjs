import https from 'https';

// Use the latest deployment URL (not cached alias)
const hostname = 'antfootball-gr17sawrg-bqmp7m2ktm-6412s-projects.vercel.app';

const req = https.request({
  hostname,
  path: '/api/predict?all=1',
  method: 'GET',
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Length:', d.length);
    try {
      const j = JSON.parse(d);
      console.log('success:', j.success, 'count:', j.count);
      if (j.data && j.data.length > 0) {
        console.log('First keys:', Object.keys(j.data[0]).join(', '));
        console.log('First:', JSON.stringify(j.data[0]).slice(0, 800));
      } else {
        console.log('Body:', d.slice(0, 500));
      }
    } catch(e) {
      console.log('Parse err:', e.message);
      console.log('Body:', d.slice(0, 500));
    }
  });
});
req.on('error', e => console.log('ERR:', e.message));
req.setTimeout(15000, () => { console.log('TIMEOUT'); req.destroy(); });
req.end();
