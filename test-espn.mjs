import https from 'https';

const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260801';

https.get(url, {headers:{'User-Agent':'AntFootball/1.0'}}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('Total events:', j.events?.length);
      console.log('Leagues:', JSON.stringify(j.leagues?.slice(0,2)));
      if (j.events?.length > 0) {
        const e = j.events[0];
        console.log('First match id:', e.id, 'name:', e.name);
        console.log('Date:', e.date);
        console.log('Status:', JSON.stringify(e.status?.type));
      } else {
        console.log('Sample response:', JSON.stringify(j).slice(0, 500));
      }
    } catch(e) {
      console.error('Parse error:', e.message);
      console.log('Raw data:', data.slice(0, 500));
    }
  });
}).on('error', e => console.error('Network error:', e.message));
