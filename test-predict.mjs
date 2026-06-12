import http from 'http';

const req = http.request({
  hostname: 'localhost', port: 3133, path: '/api/predict?all=1', method: 'GET',
  headers: { 'User-Agent': 'AntFootball/1.0' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const j = JSON.parse(data);
    console.log('success:', j.success, '| count:', j.count);
    if (j.data && j.data.length > 0) {
      const first = j.data[0];
      console.log('Keys:', Object.keys(first).join(', '));
      console.log('status:', first.status);
      console.log('startTime:', first.startTime);
      console.log('date:', first.date);
      console.log('group:', first.group);
      console.log('hasPrediction:', !!first.prediction);
      console.log('pred.recommendation:', first.prediction?.recommendation);
      console.log('--- Top 3 matches ---');
      j.data.slice(0, 3).forEach((m, i) => {
        const home = m.homeTeam?.teamName || m.homeTeam?.name || '?';
        const away = m.awayTeam?.teamName || m.awayTeam?.name || '?';
        console.log(`${i+1}. ${home} vs ${away} | status:${m.status} | grp:${m.group} | rec:${m.prediction?.recommendation || 'none'}`);
      });
    } else {
      console.log('No data:', JSON.stringify(j).slice(0, 300));
    }
  });
});
req.on('error', e => console.error('ERR:', e.message));
req.end();
