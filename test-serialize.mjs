// Test if TeamRating/prediction objects have circular references
import { getTeamRating, predictMatch } from './src/lib/prediction-engine.js';
import { getMatchOdds } from './src/lib/betting-odds.js';

const home = getTeamRating('ARG');
const away = getTeamRating('FRA');

console.log('homeTeam JSON length:', JSON.stringify(home).length);
console.log('homeTeam keys:', Object.keys(home).join(', '));

const prediction = predictMatch(home, away, null, null, null);
console.log('\nPrediction keys:', Object.keys(prediction).join(', '));
console.log('prediction.homeTeam keys:', Object.keys(prediction.homeTeam).join(', '));
console.log('prediction.awayTeam === home:', prediction.awayTeam === home);

// Test serialization of the whole prediction
try {
  const str = JSON.stringify(prediction);
  console.log('\nFull prediction JSON length:', str.length);
  console.log('First 200 chars:', str.slice(0, 200));
  console.log('✅ No circular reference');
} catch(e) {
  console.log('\n❌ Circular reference detected:', e.message);
  // Find where
  const seen = new WeakSet();
  function findCircular(obj, path = 'root') {
    if (obj && typeof obj === 'object') {
      if (seen.has(obj)) {
        console.log('  Circular at:', path);
        return;
      }
      seen.add(obj);
      for (const key of Object.keys(obj)) {
        findCircular(obj[key], path + '.' + key);
      }
    }
  }
  findCircular(prediction);
}

// Now test what route.ts would produce (the simplified response)
try {
  const resp = {
    matchId: 'test123',
    homeTeam: home.teamName,
    awayTeam: away.teamName,
    prediction: {
      recommendation: prediction.recommendation,
      homeWinProb: prediction.homeWinProb,
      drawProb: prediction.drawProb,
      awayWinProb: prediction.awayWinProb,
      homeTeam: prediction.homeTeam.teamName,
      awayTeam: prediction.awayTeam.teamName,
      confidenceLevel: prediction.confidenceLevel,
      scorePredictions: prediction.scorePredictions,
      keyInsights: prediction.keyInsights,
      riskFactors: prediction.riskFactors,
    },
  };
  const str2 = JSON.stringify(resp);
  console.log('\nRoute response JSON length:', str2.length);
  console.log('✅ Route response serializable');
  console.log('Sample:', str2.slice(0, 300));
} catch(e) {
  console.log('\n❌ Route response error:', e.message);
}
