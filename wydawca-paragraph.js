// wydawca-paragraph.js
// Auto-generator opisu wydawcy. Składa krótki akapit z najciekawszymi faktami
// z danych historycznych (8 miesięcy) i kategorii tematycznych.

(function() {
  function getHistoryArr(p, months) {
    return months.map(m => ({ month: m, entry: p.history[m.id] })).filter(x => x.entry);
  }

  function rankingPosition(rank) {
    // Zwraca pełną frazę z czasownikiem — żeby polska gramatyka się zgadzała.
    if (rank === 1) return 'jest aktualnie <span class="accent">liderem rankingu</span>';
    if (rank === 2) return 'jest aktualnie <span class="accent">wiceliderem rankingu</span>';
    if (rank === 3) return 'zajmuje aktualnie <span class="accent">trzecią pozycję w rankingu</span>';
    if (rank <= 5) return `plasuje się w <span class="accent">TOP 5</span> (#${rank})`;
    if (rank <= 10) return `zajmuje miejsce w <span class="accent">TOP 10</span> (#${rank})`;
    if (rank <= 25) return `zajmuje pozycję <strong>#${rank}</strong> w rankingu ogólnym`;
    if (rank <= 50) return `zajmuje pozycję <strong>#${rank}</strong> w rankingu ogólnym (TOP 50)`;
    if (rank <= 100) return `zajmuje pozycję <strong>#${rank}</strong> w rankingu ogólnym`;
    return `zajmuje pozycję <strong>#${rank}</strong> w rankingu`;
  }

  function bestCategory(p, CAT_NAMES) {
    if (!p.cats || !p.cats.length) return null;
    let best = null;
    for (const c of p.cats) {
      const hist = p.catHistory[c] || {};
      const entries = Object.values(hist);
      if (!entries.length) continue;
      const minRank = Math.min(...entries.map(e => e.rank));
      const latestEntry = entries[entries.length - 1];
      if (!best || latestEntry.rank < best.latestRank) {
        best = { cat: c, name: CAT_NAMES[c], minRank, latestRank: latestEntry.rank, latestScore: latestEntry.score };
      }
    }
    return best;
  }

  function describeTrend(history) {
    if (history.length < 3) return null;
    const recent = history.slice(-3).map(h => h.entry.score);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const diff = newest - oldest;
    if (Math.abs(diff) < 1) return null;
    return { direction: diff > 0 ? 'up' : 'down', magnitude: Math.abs(diff) };
  }

  function describeRankTrend(history) {
    if (history.length < 2) return null;
    const first = history[0].entry.rank;
    const last = history[history.length - 1].entry.rank;
    const diff = first - last; // positive = climbed up
    if (Math.abs(diff) < 2) return null;
    return { 
      direction: diff > 0 ? 'up' : 'down', 
      positions: Math.abs(diff),
      from: first,
      to: last,
      fromMonth: history[0].month,
      toMonth: history[history.length - 1].month
    };
  }

  function findBestMonth(history) {
    if (!history.length) return null;
    return history.reduce((best, cur) => 
      (!best || cur.entry.score > best.entry.score) ? cur : best, null);
  }

  function findWorstMonth(history) {
    if (!history.length) return null;
    return history.reduce((worst, cur) => 
      (!worst || cur.entry.score < worst.entry.score) ? cur : worst, null);
  }

  function generatePublisherParagraph(p, MONTHS, CAT_NAMES) {
    const history = getHistoryArr(p, MONTHS);
    const sentences = [];

    // 1. Opener — kim jest wydawca + holding + aktualna pozycja
    if (history.length === 0) {
      // Tylko w kategoriach
      const cat = bestCategory(p, CAT_NAMES);
      const holdingPart = p.holding ? ` z grupy <strong>${p.holding}</strong>` : '';
      if (cat) {
        sentences.push(`<strong>${p.name}</strong>${holdingPart} obecna jest w rankingu WWW jako specjalistyczna marka kategorii <span class="accent">${cat.name}</span>, gdzie zajmuje pozycję <strong>#${cat.latestRank}</strong> z wynikiem ${cat.latestScore.toFixed(2)} pkt.`);
      } else {
        sentences.push(`<strong>${p.name}</strong>${holdingPart} jest jedną z analizowanych marek w rankingu WWW.`);
      }
      return sentences.join(' ');
    }

    const latest = history[history.length - 1];
    const r = latest.entry.rank;
    const score = latest.entry.score;
    
    const holdingPart = p.holding ? `, należący do grupy <strong>${p.holding}</strong>,` : '';
    sentences.push(`<strong>${p.name}</strong>${holdingPart} ${rankingPosition(r)} z wynikiem <span class="accent">${score.toFixed(2)} pkt</span> (${latest.month.name} ${latest.month.year}).`);

    // 2. Trend pozycji albo wyniku
    const rankTrend = describeRankTrend(history);
    const scoreTrend = describeTrend(history);
    
    if (rankTrend && rankTrend.positions >= 5) {
      const dirWord = rankTrend.direction === 'up' ? 'awansował' : 'spadł';
      const cls = rankTrend.direction === 'up' ? 'up' : 'dn';
      sentences.push(`W okresie analizy <span class="${cls}">${dirWord} o ${rankTrend.positions} pozycji</span> — z #${rankTrend.from} (${rankTrend.fromMonth.name} ${rankTrend.fromMonth.year}) na #${rankTrend.to}.`);
    } else if (scoreTrend && scoreTrend.magnitude >= 2) {
      const dirWord = scoreTrend.direction === 'up' ? 'wzrasta' : 'spada';
      const cls = scoreTrend.direction === 'up' ? 'up' : 'dn';
      sentences.push(`W ostatnich trzech miesiącach wynik <span class="${cls}">${dirWord} o ${scoreTrend.magnitude.toFixed(2)} pkt</span>.`);
    }

    // 3. Najlepszy/najsłabszy miesiąc albo średnia
    const bestM = findBestMonth(history);
    const worstM = findWorstMonth(history);
    if (bestM && worstM && bestM.entry.score !== worstM.entry.score && history.length >= 3) {
      sentences.push(`Najwyższy wynik w okresie analizy: <strong>${bestM.entry.score.toFixed(2)} pkt</strong> (${bestM.month.name} ${bestM.month.year}); najniższy: <strong>${worstM.entry.score.toFixed(2)} pkt</strong> (${worstM.month.name} ${worstM.month.year}).`);
    }

    // 4. Najsilniejsza kategoria
    const cat = bestCategory(p, CAT_NAMES);
    if (cat && cat.latestRank <= 3 && r > 3) {
      sentences.push(`Najmocniejsza pozycja w kategorii <span class="accent">${cat.name}</span>, gdzie plasuje się na <strong>#${cat.latestRank}</strong>.`);
    } else if (cat && cat.minRank <= 5 && cat.latestRank <= 10) {
      sentences.push(`W kategorii tematycznej <span class="accent">${cat.name}</span> obecnie #${cat.latestRank} (najlepiej #${cat.minRank} w okresie analizy).`);
    } else if (p.cats && p.cats.length >= 2) {
      sentences.push(`Marka klasyfikowana w ${p.cats.length} kategoriach tematycznych: ${p.cats.map(c => CAT_NAMES[c]).join(', ')}.`);
    }

    return sentences.join(' ');
  }

  window.generatePublisherParagraph = generatePublisherParagraph;
})();
