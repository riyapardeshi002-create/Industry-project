/**
 * script.js  –  Zoo Crowd Predictor Frontend
 * Handles form submission, API call, result rendering, and charts.
 */

// ── Chart instances (kept globally so we can destroy & re-create) ─────────
let gaugeChart = null;
let pieChart   = null;

// ── Human-readable labels for the summary panel ──────────────────────────
const LABELS = {
  weather:       '🌤️ Weather',
  ticket_price:  '🎟️ Ticket Price',
  day_type:      '📅 Day Type',
  season:        '🌿 Season',
  holiday:       '🏖️ Holiday',
  special_event: '🎪 Special Event',
};

/**
 * Reads the form, calls /predict, and renders results.
 */
async function getPrediction() {
  const btn      = document.getElementById('predictBtn');
  const btnText  = document.getElementById('btnText');
  const spinner  = document.getElementById('btnSpinner');

  // Collect form values
  const payload = {
    weather:       document.getElementById('weather').value,
    ticket_price:  document.getElementById('ticket_price').value,
    day_type:      document.getElementById('day_type').value,
    season:        document.getElementById('season').value,
    holiday:       document.getElementById('holiday').value,
    special_event: document.getElementById('special_event').value,
  };

  // Show loading state
  btn.disabled = true;
  btnText.textContent = 'Predicting…';
  spinner.classList.remove('d-none');

  try {
    const res  = await fetch('/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Prediction failed');

    renderResults(data, payload);

  } catch (err) {
    alert('⚠️ Prediction error: ' + err.message);
  } finally {
    btn.disabled = false;
    btnText.textContent = '🔮 Predict Crowd';
    spinner.classList.add('d-none');
  }
}

/**
 * Renders all result UI elements.
 */
function renderResults(data, payload) {
  const { prediction, level, color, emoji, suggestion } = data;

  // Show result panel, hide placeholder
  document.getElementById('placeholder').classList.add('d-none');
  const panel = document.getElementById('resultPanel');
  panel.classList.remove('d-none');
  panel.classList.add('fade-in');

  // ── Hero card ────────────────────────────────────────────────
  document.getElementById('crowdLevel').textContent  = level;
  document.getElementById('crowdLevel').style.color  = color;
  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('suggestionBox').innerHTML =
    `<strong>Suggestion:</strong> ${suggestion}`;

  // ── SVG ring ─────────────────────────────────────────────────
  const circumference = 2 * Math.PI * 65; // 408.41
  const offset = circumference - (prediction / 100) * circumference;
  const ring = document.getElementById('ringFill');
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = color;
  document.getElementById('pctText').textContent = prediction + '%';

  // ── Charts ───────────────────────────────────────────────────
  renderGaugeChart(prediction, color);
  renderPieChart(prediction, color);

  // ── Summary grid ─────────────────────────────────────────────
  renderSummary(payload);

  // Smooth scroll to results on mobile
  if (window.innerWidth < 992) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Horizontal bar chart acting as a gauge / meter.
 */
function renderGaugeChart(pct, color) {
  const ctx = document.getElementById('gaugeChart').getContext('2d');

  if (gaugeChart) gaugeChart.destroy();

  gaugeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Low', 'Moderate', 'High'],
      datasets: [{
        label: 'Zones',
        data: [30, 40, 30],          // zone widths
        backgroundColor: [
          'rgba(34,197,94,0.25)',
          'rgba(251,191,36,0.25)',
          'rgba(239,68,68,0.25)',
        ],
        borderColor: [
          'rgba(34,197,94,0.6)',
          'rgba(251,191,36,0.6)',
          'rgba(239,68,68,0.6)',
        ],
        borderWidth: 1,
        borderRadius: 4,
      }, {
        label: 'Predicted',
        data: [pct, null, null],
        backgroundColor: color + 'cc',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.datasetIndex === 1
              ? ` Predicted: ${pct}%`
              : ` Zone: ${ctx.raw}%`,
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(74,222,128,0.07)' },
          ticks: { color: '#7dab8a', font: { size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#7dab8a', font: { size: 11 } },
        },
      },
    },
  });
}

/**
 * Doughnut chart showing crowd vs remaining capacity.
 */
function renderPieChart(pct, color) {
  const ctx = document.getElementById('pieChart').getContext('2d');

  if (pieChart) pieChart.destroy();

  const remaining = Math.max(0, 100 - pct);

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Crowd', 'Available'],
      datasets: [{
        data: [pct, remaining],
        backgroundColor: [color + 'cc', 'rgba(74,222,128,0.07)'],
        borderColor:     [color,         'rgba(74,222,128,0.2)'],
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#7dab8a',
            font: { size: 11 },
            padding: 12,
            boxWidth: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}%`,
          },
        },
      },
    },
  });
}

/**
 * Renders the summary grid of input parameters.
 */
function renderSummary(payload) {
  const grid = document.getElementById('summaryGrid');
  grid.innerHTML = Object.entries(payload).map(([key, val]) => `
    <div class="summary-item">
      <div class="summary-key">${LABELS[key] || key}</div>
      <div class="summary-val">${val}</div>
    </div>
  `).join('');
}
