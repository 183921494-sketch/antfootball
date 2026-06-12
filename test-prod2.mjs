import https from 'https';

const hostname = 'antfootball-ke45n59wg-bqmp7m2ktm-6412s-projects.vercel.app';

const req = https.request({
  hostname,
  path: '/api/predict?all=1',
  method: 'GET',
  headers: { 'User-Agent': 'AntFootball/1.0' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('HTTP:', res.statusCode);
      console.log('success:', j.success);
      console.log('count:', j.count);
      if (j.data && j.data.length > 0) {
        const first = j.data[0];
        // Use JSON.parse + replacer to handle circular refs
        const safe = JSON.parse(JSON.stringify(first, (k, v) => {
          if (typeof v === 'object' && v !== null) {
            if (Object.keys(v).length === 0) return '[EmptyObject]';
          }
          return v;
        }));
        console.log('First item (safe):', JSON.stringify(safe, null, 2).slice(0, 2000));
      } else {
        console.log('No data:', JSON.stringify(j).slice(0, 500));
      }
    } catch(e) {
      console.error('Error:', e.message);
      console.log('Raw:', data.slice(0, 500));
    }
  });
});
req.on('error', e => console.error('ERR:', e.message));
req.end();
