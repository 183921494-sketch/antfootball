import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3133,
  path: '/api/predict?all=1',
  method: 'GET',
  headers: { 'User-Agent': 'AntFootball/1.0' }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('success:', j.success, '| count:', j.count);
      if (j.data?.length > 0) {
        const first = j.data[0];
        console.log('Keys:', Object.keys(first).join(', '));
        console.log('Sample:', JSON.stringify({
          espnMatchId: first.espnMatchId,
          matchDate: first.matchDate,
          date: first.date,
          matchStatus: first.matchStatus,
          status: first.status,
          group: first.group,
          homeScore: first.homeScore,
          awayScore: first.awayScore,
          venue: first.venue,
          hasPrediction: !!first.prediction,
        }, null, 2));
        if (first.prediction) {
          console.log('Prediction keys:', Object.keys(first.prediction).join(', '));
        }
      } else {
        console.log('No data:', JSON.stringify(j).slice(0, 300));
      }
    } catch(e) {
      console.error('Error:', e.message);
      console.log('Raw:', data.slice(0, 500));
    }
  });
});
req.on('error', e => console.error('Network:', e.message));
req.end();
