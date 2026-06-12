import https from 'https';

// Test against production URL
const hostname = 'antfootball-ke45n59wg-bqmp7m2ktm-6412s-projects.vercel.app';

const req = https.request({
  hostname, path: '/api/predict?all=1', method: 'GET',
  headers: { 'User-Agent': 'AntFootball/1.0', 'Accept': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('success:', j.success, '| count:', j.count);
      if (j.data && j.data.length > 0) {
        const first = j.data[0];
        console.log('Keys:', Object.keys(first).join(', '));
        console.log('status:', first.status);
        console.log('startTime:', first.startTime);
        console.log('date:', first.date);
        console.log('hasPrediction:', !!first.prediction);
        console.log('rec:', first.prediction?.recommendation);
        console.log('\n--- Sample upcoming matches ---');
        j.data.filter(m => m.status === 'pre').slice(0, 3).forEach((m, i) => {
          const home = m.homeTeam?.name || JSON.stringify(m.homeTeam);
          const away = m.awayTeam?.name || JSON.stringify(m.awayTeam);
          console.log(`${i+1}. ${home} vs ${away} | grp:${m.group} | start:${m.startTime}`);
        });
        console.log('\n--- Finished matches ---');
        j.data.filter(m => m.status === 'finished').slice(0, 2).forEach((m, i) => {
          const home = m.homeTeam?.name || JSON.stringify(m.homeTeam);
          const away = m.awayTeam?.name || JSON.stringify(m.awayTeam);
          console.log(`${i+1}. ${home} ${m.homeScore}-${m.awayScore} ${away}`);
        });
      } else {
        console.log('No data:', JSON.stringify(j).slice(0, 300));
      }
    } catch(e) {
      console.error('Parse error:', e.message);
      console.log('Raw:', data.slice(0, 500));
    }
  });
});
req.on('error', e => console.error('ERR:', e.message));
req.end();
