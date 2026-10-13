/* Búsqueda tolerante a tildes, errores de escritura y términos parciales. */
(function(){
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  function distance(a,b){if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[b.length];}
  function score(query, text){const q=normalize(query),t=normalize(text);if(!q)return 1;if(!t)return 0;if(t.includes(q))return 1;const qs=q.split(' '),ts=t.split(' ');let total=0;for(const token of qs){let best=0;for(const word of ts){if(word.includes(token)||token.includes(word)){best=Math.max(best,Math.min(token.length,word.length)/Math.max(token.length,word.length));continue;}const d=distance(token,word);const sim=1-d/Math.max(token.length,word.length,1);best=Math.max(best,sim);}total+=best;}return total/qs.length;}
  function rank(items,query,getText,threshold=.38){const q=normalize(query);if(!q)return items.slice();return items.map((item,index)=>({item,index,score:score(q,getText(item))})).filter(x=>x.score>=threshold).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);}
  window.CupissaSearch={normalize,score,rank};
})();
