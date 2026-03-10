import { useEffect, useMemo, useState } from "react";
import "./App.css";

const starterTrades = [
  {
    id: 1,
    ticker: "WTI",
    direction: "put",
    stock: 3.35,
    strike: 0.5,
    premium: 0.05,
    dte: 120,
    volume: 5000000,
    relVol: 2,
    notes: "Lottery tail bet",
  },
];

function analyzeTrade({ direction, stock, strike, premium, dte, volume, relVol }) {
  const cost = premium * 100;
  const breakeven = direction === "call" ? strike + premium : strike - premium;
  const moveNeededPct = stock > 0 ? ((breakeven - stock) / stock) * 100 : 0;
  const absMoveNeeded = Math.abs(moveNeededPct);

  let affordabilityScore = 0;
  if (cost <= 10) affordabilityScore = 30;
  else if (cost <= 20) affordabilityScore = 20;
  else if (cost <= 35) affordabilityScore = 10;

  let expirationScore = 0;
  if (dte >= 45 && dte <= 90) expirationScore = 20;
  else if (dte >= 30 && dte <= 120) expirationScore = 12;
  else expirationScore = 5;

  let moveScore = 0;
  if (absMoveNeeded <= 15) moveScore = 30;
  else if (absMoveNeeded <= 25) moveScore = 22;
  else if (absMoveNeeded <= 40) moveScore = 14;
  else if (absMoveNeeded <= 60) moveScore = 6;

  let volumeScore = 0;
  if (volume >= 5000000) volumeScore = 10;
  else if (volume >= 1000000) volumeScore = 6;
  else if (volume > 0) volumeScore = 3;

  let relVolumeScore = 0;
  if (relVol >= 2) relVolumeScore = 10;
  else if (relVol >= 1.5) relVolumeScore = 7;
  else if (relVol >= 1) relVolumeScore = 4;

  const score = Math.max(
    0,
    Math.min(
      100,
      affordabilityScore +
        expirationScore +
        moveScore +
        volumeScore +
        relVolumeScore
    )
  );

  let rating = "Skip";
  if (score >= 80) rating = "Strong setup";
  else if (score >= 65) rating = "Good setup";
  else if (score >= 50) rating = "Speculative";
  else if (score >= 35) rating = "Lottery only";

  let riskTag = "Lottery";
  if (absMoveNeeded <= 20) riskTag = "Reasonable";
  else if (absMoveNeeded <= 40) riskTag = "Stretch";

  const failReasons = [];
  if (cost > 10) failReasons.push("Over budget");
  if (absMoveNeeded > 60) failReasons.push("Move too large");
  if (dte < 30) failReasons.push("Too little time");
  if (volume > 0 && volume < 1000000) failReasons.push("Low volume");
  if (relVol > 0 && relVol < 1) failReasons.push("Weak relative volume");

  const hardFail = failReasons.length > 0;

  return {
    cost,
    breakeven,
    moveNeededPct,
    absMoveNeeded,
    score,
    rating,
    riskTag,
    hardFail,
    failReasons,
  };
}

function DecisionCard({ title, trade }) {
  if (!trade) {
    return (
      <div className="trade-card">
        <div className="trade-top">
          <div>
            <h3>{title}</h3>
            <p>No matching trade yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-card top-pick">
      <div className="trade-top">
        <div>
          <h3>{title}</h3>
          <p>
            {trade.ticker} {trade.direction.toUpperCase()} • Strike $
            {trade.strike.toFixed(2)}
          </p>
        </div>
        <div className="score-chip">{trade.score}</div>
      </div>

      <div className="mini-grid">
        <div>
          <span>Cost</span>
          <strong>${trade.cost.toFixed(2)}</strong>
        </div>
        <div>
          <span>Breakeven</span>
          <strong>${trade.breakeven.toFixed(2)}</strong>
        </div>
        <div>
          <span>Move</span>
          <strong>{trade.moveNeededPct.toFixed(2)}%</strong>
        </div>
        <div>
          <span>Risk</span>
          <strong>{trade.riskTag}</strong>
        </div>
      </div>

      <div className="trade-footer">
        <span className="rating-pill small">{trade.rating}</span>
      </div>

      {trade.notes ? <p className="trade-notes">{trade.notes}</p> : null}
      {trade.hardFail ? (
        <div className="fail-box">{trade.failReasons.join(" • ")}</div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [scannerError, setScannerError] = useState("");
  const [marketStocks, setMarketStocks] = useState([]);
  const [loadingScanner, setLoadingScanner] = useState(false);
  const [marketMode, setMarketMode] = useState("mixed");
  const [scannerMode, setScannerMode] = useState("strict");
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState("call");
  const [stockPrice, setStockPrice] = useState("");
  const [strikePrice, setStrikePrice] = useState("");
  const [premium, setPremium] = useState("");
  const [daysToExpiration, setDaysToExpiration] = useState("60");
  const [todayVolume, setTodayVolume] = useState("");
  const [relativeVolume, setRelativeVolume] = useState("");
  const [notes, setNotes] = useState("");
  const [aiResult, setAiResult] = useState(null);

 async function scanMarket() {
  try {
    setLoadingScanner(true);
    setScannerError("");
    setMarketStocks([]);

    const response = await fetch(
      "https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=demo"
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No stock data returned");
    }

    const filtered = data.slice(0, 12);
    setMarketStocks(filtered);
  } catch (err) {
    console.error(err);
    setScannerError(err.message || "Scanner failed");
  } finally {
    setLoadingScanner(false);
  }
}
   const [savedTrades, setSavedTrades] = useState(() => {
    const saved = localStorage.getItem("tradeFinderSavedTrades");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return starterTrades.map((trade) => ({
          ...trade,
          ...analyzeTrade(trade),
        }));
      }
    }
<section className="card top-picks-card">
  <div className="saved-header">
    <h2>Strategy Picks</h2>
    <span>{marketMode.toUpperCase()} MODE</span>
  </div>

  {strategyTrades.length === 0 ? (
    <div className="empty-state">
      No trades match the strategy yet.
    </div>
  ) : (
    <div className="saved-grid">
      {strategyTrades.map((trade) => (
        <div key={trade.id} className="trade-card top-pick">
          <div className="trade-top">
            <div>
              <h3>
                {trade.ticker} {trade.direction.toUpperCase()}
              </h3>
              <p>
                Strike ${trade.strike.toFixed(2)} • Premium $
                {trade.premium.toFixed(2)}
              </p>
            </div>

            <div className="score-chip">{trade.score}</div>
          </div>

          <div className="mini-grid">
            <div>
              <span>Cost</span>
              <strong>${trade.cost.toFixed(2)}</strong>
            </div>

            <div>
              <span>DTE</span>
              <strong>{trade.dte}</strong>
            </div>

            <div>
              <span>Move</span>
              <strong>{trade.moveNeededPct.toFixed(2)}%</strong>
            </div>

            <div>
              <span>Risk</span>
              <strong>{trade.riskTag}</strong>
            </div>
          </div>

          <div className="trade-footer">
            <span className="rating-pill small">{trade.rating}</span>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
    return starterTrades.map((trade) => ({
      ...trade,
      ...analyzeTrade(trade),
    }));
  });

  const [bulkText, setBulkText] = useState(
    "LCID,call,3.20,5,0.06,60,4000000,1.8,EV sympathy\nSOFI,call,18.22,30,0.37,90,8000000,1.9,Too expensive example"
  );

  const stock = parseFloat(stockPrice) || 0;
  const strike = parseFloat(strikePrice) || 0;
  const prem = parseFloat(premium) || 0;
  const dte = parseFloat(daysToExpiration) || 0;
  const volume = parseFloat(todayVolume) || 0;
  const relVol = parseFloat(relativeVolume) || 0;

  const analysis = useMemo(() => {
    return analyzeTrade({
      direction,
      stock,
      strike,
      premium: prem,
      dte,
      volume,
      relVol,
    });
  }, [direction, stock, strike, prem, dte, volume, relVol]);
  useEffect(() => {
    localStorage.setItem(
      "tradeFinderSavedTrades",
      JSON.stringify(savedTrades)
    );
  }, [savedTrades]);

  function clearInputs() {
    setTicker("");
    setDirection("call");
    setStockPrice("");
    setStrikePrice("");
    setPremium("");
    setDaysToExpiration("60");
    setTodayVolume("");
    setRelativeVolume("");
    setNotes("");
  }

  function saveTrade() {
    if (!ticker || !stock || !strike || !prem) return;

    const newTrade = {
      id: Date.now(),
      ticker: ticker.toUpperCase(),
      direction,
      stock,
      strike,
      premium: prem,
      dte,
      volume,
      relVol,
      notes,
      ...analysis,
    };

    setSavedTrades((prev) =>
      [...prev, newTrade].sort((a, b) => b.score - a.score)
    );
  }

  function deleteTrade(id) {
    setSavedTrades((prev) => prev.filter((trade) => trade.id !== id));
  }

  function importBulkTrades() {
    const lines = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed = lines
      .map((line, index) => {
        const parts = line.split(",");
        if (parts.length < 8) return null;

        const [
          rawTicker,
          rawDirection,
          rawStock,
          rawStrike,
          rawPremium,
          rawDte,
          rawVolume,
          rawRelVol,
          rawNotes = "",
        ] = parts;

        const trade = {
          id: Date.now() + index,
          ticker: rawTicker.trim().toUpperCase(),
          direction: rawDirection.trim().toLowerCase() === "put" ? "put" : "call",
          stock: parseFloat(rawStock) || 0,
          strike: parseFloat(rawStrike) || 0,
          premium: parseFloat(rawPremium) || 0,
          dte: parseFloat(rawDte) || 0,
          volume: parseFloat(rawVolume) || 0,
          relVol: parseFloat(rawRelVol) || 0,
          notes: rawNotes.trim(),
        };

        return {
          ...trade,
          ...analyzeTrade(trade),
        };
      })
      .filter(Boolean);

    setSavedTrades((prev) =>
      [...prev, ...parsed].sort((a, b) => b.score - a.score)
    );
  }

  async function rankWithAI() {
    try {
      const response = await fetch("http://localhost:3001/api/rank-trades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trades: savedTrades,
        }),
      });

      const data = await response.json();
      setAiResult(data.result);
    } catch (err) {
      console.error(err);
      setAiResult("AI request failed. Make sure server.js is running.");
    }
  }

  const sortedTrades = [...savedTrades].sort((a, b) => b.score - a.score);

  const topThree = sortedTrades.slice(0, 3);
  const bestCall = sortedTrades.find((trade) => trade.direction === "call");
  const bestPut = sortedTrades.find((trade) => trade.direction === "put");
  const bestCheap = sortedTrades.find((trade) => trade.cost <= 10);

  const scannerTrades = sortedTrades.filter((trade) => {
    const strict =
      trade.cost <= 10 &&
      trade.dte >= 40 &&
      trade.dte <= 90 &&
      trade.volume >= 1000000 &&
      trade.relVol >= 1 &&
      !trade.hardFail;

    const loose =
      trade.cost <= 15 &&
      trade.dte >= 30 &&
      trade.dte <= 120 &&
      trade.volume >= 500000 &&
      trade.relVol >= 0.8;

    return scannerMode === "strict" ? strict : loose;
  });

  const scannerTop = scannerTrades.slice(0, 6);

  const calls = scannerTrades.filter((t) => t.direction === "call");
const puts = scannerTrades.filter((t) => t.direction === "put");

let strategyTrades = [];

if (marketMode === "bullish") {
  strategyTrades = [...calls.slice(0, 2), ...puts.slice(0, 1)];
}

if (marketMode === "bearish") {
  strategyTrades = [...puts.slice(0, 2), ...calls.slice(0, 1)];
}

if (marketMode === "mixed") {
  strategyTrades = scannerTrades.slice(0, 3);
}
  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <div>
            <h1>$10 Trade Finder</h1>
            <p>Manual analyzer and watchlist ranker for cheap option contracts.</p>
          </div>
          <div className="hero-card">
            <div>Target cost: $1–$10</div>
            <div>Best DTE: 45–90 days</div>
          </div>
        </header>

        <section className="card top-picks-card">
          <div className="saved-header">
            <h2>Top Ranked Trades</h2>
            <span>Current best 3</span>
          </div>

          {topThree.length === 0 ? (
            <div className="empty-state">No trades ranked yet.</div>
          ) : (
            <div className="saved-grid">
              {topThree.map((trade) => (
                <div key={trade.id} className="trade-card top-pick">
                  <div className="trade-top">
                    <div>
                      <h3>
                        {trade.ticker} {trade.direction.toUpperCase()}
                      </h3>
                      <p>
                        Strike ${trade.strike.toFixed(2)} • Premium $
                        {trade.premium.toFixed(2)}
                      </p>
                    </div>
                    <div className="score-chip">{trade.score}</div>
                  </div>

                  <div className="mini-grid">
                    <div>
                      <span>Cost</span>
                      <strong>${trade.cost.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Breakeven</span>
                      <strong>${trade.breakeven.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Move</span>
                      <strong>{trade.moveNeededPct.toFixed(2)}%</strong>
                    </div>
                    <div>
                      <span>Risk</span>
                      <strong>{trade.riskTag}</strong>
                    </div>
                  </div>

                  <div className="trade-footer">
                    <span className="rating-pill small">{trade.rating}</span>
                  </div>

                  {trade.notes ? <p className="trade-notes">{trade.notes}</p> : null}
                  {trade.hardFail ? (
                    <div className="fail-box">{trade.failReasons.join(" • ")}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card top-picks-card">
          <div className="saved-header">
            <h2>Decision Dashboard</h2>
            <span>Best directional picks</span>
          </div>
        <section className="card top-picks-card">
          <div className="saved-header">
            <h2>Cheap Options Scanner</h2>
            <span>
              {scannerMode === "strict" ? "Strict mode" : "Loose mode"}
            </span>
          </div>

          <div className="button-row" style={{ marginTop: 0, marginBottom: 16 }}>
            <button
              className={scannerMode === "strict" ? "primary" : "secondary"}
              onClick={() => setScannerMode("strict")}
            >
              Strict
            </button>
            <button
              className={scannerMode === "loose" ? "primary" : "secondary"}
              onClick={() => setScannerMode("loose")}
            >
              Loose
            </button>
          </div>
<div className="button-row" style={{ marginBottom: 16 }}>
  <button
    className={marketMode === "bullish" ? "primary" : "secondary"}
    onClick={() => setMarketMode("bullish")}
  >
    Bullish Week
  </button>

  <button
    className={marketMode === "bearish" ? "primary" : "secondary"}
    onClick={() => setMarketMode("bearish")}
  >
    Bearish Week
  </button>

  <button
    className={marketMode === "mixed" ? "primary" : "secondary"}
    onClick={() => setMarketMode("mixed")}
  >
    Mixed Market
  </button>
</div>
          <p className="import-help">
            Strict = your real system. Loose = wider net for idea generation.
          </p>

          {scannerTop.length === 0 ? (
            <div className="empty-state">
              No trades match the scanner yet. Import or save more trades.
            </div>
          ) : (
            <div className="saved-grid">
              {scannerTop.map((trade) => (
                <div key={trade.id} className="trade-card top-pick">
                  <div className="trade-top">
                    <div>
                      <h3>
                        {trade.ticker} {trade.direction.toUpperCase()}
                      </h3>
                      <p>
                        Strike ${trade.strike.toFixed(2)} • Premium $
                        {trade.premium.toFixed(2)}
                      </p>
                    </div>
                    <div className="score-chip">{trade.score}</div>
                  </div>

                  <div className="mini-grid">
                    <div>
                      <span>Cost</span>
                      <strong>${trade.cost.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>DTE</span>
                      <strong>{trade.dte}</strong>
                    </div>
                    <div>
                      <span>Move</span>
                      <strong>{trade.moveNeededPct.toFixed(2)}%</strong>
                    </div>
                    <div>
                      <span>Risk</span>
                      <strong>{trade.riskTag}</strong>
                    </div>
                  </div>

                  <div className="trade-footer">
                    <span className="rating-pill small">{trade.rating}</span>
                  </div>

                  {trade.notes ? <p className="trade-notes">{trade.notes}</p> : null}

                  {trade.hardFail ? (
                    <div className="fail-box">
                      {trade.failReasons.join(" • ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
          <div className="saved-grid">
            <DecisionCard title="Best Call" trade={bestCall} />
            <DecisionCard title="Best Put" trade={bestPut} />
            <DecisionCard title="Best Cheap Trade" trade={bestCheap} />
          </div>
        </section>

        <section className="grid two-col">
          <div className="card">
            <h2>Trade Input</h2>

            <div className="form-grid">
              <label>
                <span>Ticker</span>
                <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="LCID" />
              </label>

              <label>
                <span>Direction</span>
                <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                </select>
              </label>

              <label>
                <span>Stock price</span>
                <input type="number" step="0.01" value={stockPrice} onChange={(e) => setStockPrice(e.target.value)} placeholder="3.35" />
              </label>

              <label>
                <span>Strike price</span>
                <input type="number" step="0.01" value={strikePrice} onChange={(e) => setStrikePrice(e.target.value)} placeholder="5.00" />
              </label>

              <label>
                <span>Premium</span>
                <input type="number" step="0.01" value={premium} onChange={(e) => setPremium(e.target.value)} placeholder="0.05" />
              </label>

              <label>
                <span>Days to expiration</span>
                <input type="number" value={daysToExpiration} onChange={(e) => setDaysToExpiration(e.target.value)} placeholder="60" />
              </label>

              <label>
                <span>Today volume</span>
                <input type="number" value={todayVolume} onChange={(e) => setTodayVolume(e.target.value)} placeholder="5000000" />
              </label>

              <label>
                <span>Relative volume</span>
                <input type="number" step="0.1" value={relativeVolume} onChange={(e) => setRelativeVolume(e.target.value)} placeholder="2.0" />
              </label>
            </div>

            <label className="notes-box">
              <span>Notes / catalyst</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Earnings, sympathy move, crypto run, oversold bounce..." />
            </label>

            <div className="button-row">
              <button className="primary" onClick={saveTrade}>Save trade</button>
              <button className="secondary" onClick={clearInputs}>Clear</button>
            </div>
          </div>

          <div className="card">
            <h2>Live Analysis</h2>

            <div className="stats-grid">
              <div className="stat">
                <span>Contract cost</span>
                <strong>${analysis.cost.toFixed(2)}</strong>
              </div>
              <div className="stat">
                <span>Breakeven</span>
                <strong>${analysis.breakeven.toFixed(2)}</strong>
              </div>
              <div className="stat">
                <span>Move needed</span>
                <strong>{analysis.moveNeededPct.toFixed(2)}%</strong>
              </div>
              <div className="stat">
                <span>Risk</span>
                <strong>{analysis.riskTag}</strong>
              </div>
            </div>

            <div className="score-box">
              <div className="score-top">
                <div>
                  <span className="muted">Score</span>
                  <h3>{analysis.score}</h3>
                </div>
                <div className="rating-pill">{analysis.rating}</div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${analysis.score}%` }} />
              </div>
            </div>

            <div className="rules-box">
              <h3>What this rewards</h3>
              <ul>
                <li>Cheap contracts</li>
                <li>45–90 day expiration</li>
                <li>Smaller move needed to breakeven</li>
                <li>Higher volume and relative volume</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="saved-header">
            <h2>Watchlist Import</h2>
            <span>One line per trade</span>
          </div>
<section className="card">
  <div className="saved-header">
    <h2>Market Scanner</h2>
    <span>High activity stocks</span>
  </div>
{scannerError ? (
  <div className="fail-box" style={{ marginBottom: 16 }}>
    Scanner error: {scannerError}
  </div>
) : null}
  <div className="button-row" style={{ marginBottom: 16 }}>
    <button className="primary" onClick={scanMarket}>
      Scan Market
    </button>
  </div>

  {loadingScanner ? (
    <div className="empty-state">Scanning market...</div>
  ) : marketStocks.length === 0 ? (
    <div className="empty-state">
      Click "Scan Market" to find active stocks.
    </div>
  ) : (
    <div className="saved-grid">
      {marketStocks.map((stock) => (
        <div key={stock.symbol} className="trade-card">
          <div className="trade-top">
            <div>
              <h3>{stock.symbol}</h3>
              <p>${stock.price?.toFixed(2)}</p>
            </div>

            <div className="score-chip">
              {stock.changesPercentage?.toFixed(1)}%
            </div>
          </div>

          <div className="mini-grid">
            <div>
              <span>Volume</span>
              <strong>{stock.volume?.toLocaleString()}</strong>
            </div>

            <div>
              <span>Change</span>
              <strong>{stock.change?.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
          <p className="import-help">
            Format:
            <br />
            TICKER,direction,stock,strike,premium,dte,volume,relVol,notes
          </p>

          <textarea className="bulk-box" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />

          <div className="button-row">
            <button className="primary" onClick={importBulkTrades}>Import watchlist</button>
          </div>
        </section>

        <section className="card">
          <div className="saved-header">
            <h2>Saved Trades</h2>
            <span>Best score first</span>
          </div>

          <div className="button-row" style={{ marginTop: 0, marginBottom: 16 }}>
  <button className="primary" onClick={rankWithAI}>
    Rank Trades With AI
  </button>
  <button
    className="secondary"
    onClick={() => {
      localStorage.removeItem("tradeFinderSavedTrades");
      setSavedTrades([]);
    }}
  >
    Clear Saved Trades
  </button>
</div>

          {savedTrades.length === 0 ? (
            <div className="empty-state">
              No saved trades yet. Add a few contracts from Robinhood and compare them here.
            </div>
          ) : (
            <div className="saved-grid">
              {savedTrades.map((trade) => (
                <div key={trade.id} className="trade-card">
                  <div className="trade-top">
                    <div>
                      <h3>
                        {trade.ticker} {trade.direction.toUpperCase()}
                      </h3>
                      <p>
                        Strike ${trade.strike.toFixed(2)} • Premium $
                        {trade.premium.toFixed(2)}
                      </p>
                    </div>
                    <div className="score-chip">{trade.score}</div>
                  </div>

                  <div className="mini-grid">
                    <div>
                      <span>Cost</span>
                      <strong>${trade.cost.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Breakeven</span>
                      <strong>${trade.breakeven.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Move</span>
                      <strong>{trade.moveNeededPct.toFixed(2)}%</strong>
                    </div>
                    <div>
                      <span>Risk</span>
                      <strong>{trade.riskTag}</strong>
                    </div>
                  </div>

                  <div className="trade-footer">
                    <span className="rating-pill small">{trade.rating}</span>
                    <button className="danger" onClick={() => deleteTrade(trade.id)}>
                      Delete
                    </button>
                  </div>

                  {trade.notes ? <p className="trade-notes">{trade.notes}</p> : null}
                  {trade.hardFail ? (
                    <div className="fail-box">{trade.failReasons.join(" • ")}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {aiResult && (
          <section className="card">
            <h2>AI Trade Ranking</h2>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{aiResult}</pre>
          </section>
        )}
      </div>
    </div>
  );
}
// deploy test