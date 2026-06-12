import http from 'http';

const req = http.request({
  hostname: 'localhost', port: 3133, path: '/api/predict?all=1', method: 'GET',
  headers: { 'User-Agent': 'AntFootball/1.0' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const j = JSON.parse(data);
    const first = j.data[0];
    console.log(JSON.stringify(first, null, 2).slice(0, 3000));
    console.log('\n--- All match statuses ---');
    const statusCounts = { pre: 0, inprogress: 0, finished: 0 };
    j.data.forEach(m => {
      if (m.status === 'pre') statusCounts.pre++;
      else if (m.status === 'inprogress') statusCounts.inprogress++;
      else if (m.status === 'finished') statusCounts.finished++;
    });
    console.log(statusCounts);
    console.log('\n--- Sample upcoming matches ---');
    j.data.filter(m => m.status === 'pre').slice(0, 3).forEach((m, i) => {
      console.log(i+1 + '.', m.homeTeam?.name, 'vs', m.awayTeam?.name, '| startTime:', m.startTime, '| group:', m.group);
    });
  });
});
req.on('error', e => console.error('ERR:', e.message));
req.end();
