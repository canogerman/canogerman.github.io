document.addEventListener('DOMContentLoaded', () => {
    const screens = {
        'screen-instrument-selection': document.getElementById('screen-instrument-selection'),
        'screen-graph': document.getElementById('screen-graph'),
        'screen-new-reading': document.getElementById('screen-new-reading'),
    };

    const navButtons = document.querySelectorAll('.nav-button');
    const instrumentListContainer = document.getElementById('instrument-list');
    const searchInstrumentInput = document.getElementById('search-instrument-input');
    const downloadReportButton = document.getElementById('download-report-button');
    const instrumentSelectChart = document.getElementById('instrument-select-chart');
    const chartTitle = document.getElementById('chart-title');
    const latestMeasurement = document.getElementById('latest-measurement');
    const chartCanvas = document.getElementById('measurements-chart');
    const newReadingDate = document.getElementById('new-reading-date');
    const newReadingInput = document.getElementById('new-reading-input');
    const newReadingInstrumentSelect = document.getElementById('new-reading-instrument-select');
    const calculatedMagnitude = document.getElementById('calculated-magnitude');
    const saveReadingButton = document.getElementById('save-reading-button');

    let measurements = [];
    let equations = [];
    let sessionReadings = []; // To store new readings from this session
    let chart = null;

    // --- DATA LOADING ---
    Promise.all([
        fetch('db.json').then(res => res.json()),
        fetch('equations.json').then(res => res.json()),
    ]).then(([dbData, equationsData]) => {
        measurements = dbData.measurements;
        equations = equationsData.equations;
        initializeApp();
    });

    function initializeApp() {
        setupNavigation();
        populateInstrumentList();
        populateInstrumentSelects();
        setupNewReadingForm();
        setupReportGenerator();
        showScreen('screen-instrument-selection');
    }

    // --- NAVIGATION ---
    function setupNavigation() {
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const screenId = button.dataset.screen;
                if (screenId) {
                    showScreen(screenId);
                }
            });
        });
    }

    function showScreen(screenId, instrumentName = null) {
        Object.values(screens).forEach(screen => screen.style.display = 'none');
        screens[screenId].style.display = 'block';

        // Update active button style in footers
        document.querySelectorAll('.nav-button').forEach(btn => {
            const p = btn.querySelector('p');
            const span = btn.querySelector('span');
            if (btn.dataset.screen === screenId) {
                btn.classList.remove('text-slate-400', 'hover:text-[var(--primary-color)]');
                btn.classList.add('text-[var(--primary-color)]');
                if(p) p.classList.add('text-[var(--primary-color)]');
                if(span) span.classList.add('text-[var(--primary-color)]');
            } else {
                btn.classList.add('text-slate-400', 'hover:text-[var(--primary-color)]');
                btn.classList.remove('text-[var(--primary-color)]');
                 if(p) p.classList.remove('text-[var(--primary-color)]');
                 if(span) span.classList.remove('text-[var(--primary-color)]');
            }
        });

        if (screenId === 'screen-graph') {
            const targetInstrument = instrumentName || instrumentSelectChart.value || getUniqueInstruments()[0];
            instrumentSelectChart.value = targetInstrument;
            updateChart(targetInstrument);
        }
    }

    // --- INSTRUMENT LIST SCREEN ---
    function getUniqueInstruments() {
        const instrumentNames = measurements.map(m => m.instrumento);
        return [...new Set(instrumentNames)];
    }

    function populateInstrumentList() {
        const instruments = getUniqueInstruments();
        instrumentListContainer.innerHTML = '';
        instruments.forEach(instrument => {
            const lastMeasurement = measurements.filter(m => m.instrumento === instrument).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
            const instrumentElement = document.createElement('a');
            instrumentElement.href = '#';
            instrumentElement.className = 'instrument-item flex items-center gap-4 px-4 py-3 hover:bg-slate-800/60 transition-colors duration-200';
            instrumentElement.innerHTML = `                <div class="text-white flex items-center justify-center rounded-lg bg-slate-800 shrink-0 size-12">
                    <span class="material-symbols-outlined text-3xl text-[var(--primary-color)]">monitoring</span>
                </div>
                <div class="flex flex-col justify-center">
                    <p class="text-white text-base font-medium leading-normal">${instrument}</p>
                    <p class="text-slate-400 text-sm font-normal leading-normal">Última medición: ${lastMeasurement ? lastMeasurement.fecha : 'N/A'}</p>
                </div>
                <span class="material-symbols-outlined text-slate-500 ml-auto">chevron_right</span>
            `;
            instrumentElement.addEventListener('click', (e) => {
                e.preventDefault();
                showScreen('screen-graph', instrument);
            });
            instrumentListContainer.appendChild(instrumentElement);
        });
    }
    
    searchInstrumentInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.instrument-item').forEach(item => {
            const instrumentName = item.querySelector('p').textContent.toLowerCase();
            if (instrumentName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // --- REPORT GENERATOR ---
    function setupReportGenerator() {
        downloadReportButton.addEventListener('click', () => {
            if (sessionReadings.length === 0) {
                alert('No hay nuevas lecturas en esta sesión para generar un reporte.');
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            let reportContent = `Reporte de Mediciones - ${today}\n\n`;
            reportContent += "====================================\n";

            sessionReadings.forEach(reading => {
                const equationData = equations.find(eq => eq.instrumento === reading.instrumento);
                const unit = equationData ? equationData.unit : '';

                reportContent += `Instrumento: ${reading.instrumento}\n`;
                reportContent += `Fecha: ${reading.fecha}\n`;
                reportContent += `Lectura: ${reading.lectura}\n`;
                reportContent += `Magnitud Calculada: ${reading.magnitud_fisica.toFixed(2)} ${unit}\n`;
                reportContent += "====================================\n";
            });

            const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `reporte-${today}.txt`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // --- GRAPH SCREEN ---
    function populateInstrumentSelects() {
        const instruments = getUniqueInstruments();
        instrumentSelectChart.innerHTML = '';
        newReadingInstrumentSelect.innerHTML = '<option disabled selected value="">Seleccionar Instrumento</option>';
        instruments.forEach(instrument => {
            const option1 = new Option(instrument, instrument);
            const option2 = new Option(instrument, instrument);
            instrumentSelectChart.add(option1);
            newReadingInstrumentSelect.add(option2);
        });
    }

    instrumentSelectChart.addEventListener('change', (e) => {
        updateChart(e.target.value);
    });

    function updateChart(instrumentName) {
        const instrumentMeasurements = measurements
            .filter(m => m.instrumento === instrumentName)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        const equationData = equations.find(eq => eq.instrumento === instrumentName);
        const unit = equationData ? equationData.unit : '';
        const variable = equationData ? equationData.variable : 'Magnitud';

        chartTitle.textContent = `${variable} (${unit}) vs. Fecha`;
        const latest = instrumentMeasurements[instrumentMeasurements.length - 1];
        if(latest && latest.magnitud_fisica != null) {
            latestMeasurement.textContent = `${latest.magnitud_fisica.toFixed(2)} ${unit}`;
        } else {
            latestMeasurement.textContent = '--';
        }

        const labels = instrumentMeasurements.map(m => m.fecha);
        const data = instrumentMeasurements.map(m => m.magnitud_fisica);

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: instrumentName,
                    data: data,
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(17, 147, 212, 0.3)',
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { color: '#92b7c9' },
                        grid: { color: '#325567' }
                    },
                    x: {
                        ticks: { color: '#92b7c9' },
                        grid: { color: 'transparent' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // --- NEW READING SCREEN ---
    function setupNewReadingForm() {
        newReadingDate.value = new Date().toISOString().split('T')[0]; // Set today's date
        newReadingInput.addEventListener('input', calculateMagnitude);
        newReadingInstrumentSelect.addEventListener('change', calculateMagnitude);
        saveReadingButton.addEventListener('click', saveNewReading);
    }

    function calculateMagnitude() {
        const reading = parseFloat(newReadingInput.value);
        const instrumentName = newReadingInstrumentSelect.value;

        if (isNaN(reading) || !instrumentName) {
            calculatedMagnitude.value = '--';
            return;
        }

        const equationData = equations.find(eq => eq.instrumento === instrumentName);
        if (!equationData) {
            calculatedMagnitude.value = 'Ecuación no encontrada';
            return;
        }

        try {
            // IMPORTANT: Using eval can be a security risk in a real-world app 
            // with user-provided equations. Here it's safe as equations are from a trusted source (equations.json).
            const result = eval(equationData.equation.replace(/lectura/g, reading));
            calculatedMagnitude.value = `${result.toFixed(2)} ${equationData.unit}`;
        } catch (error) {
            console.error('Error calculating magnitude:', error);
            calculatedMagnitude.value = 'Error en cálculo';
        }
    }

    function saveNewReading() {
        const fecha = newReadingDate.value;
        const instrumento = newReadingInstrumentSelect.value;
        const lectura = parseFloat(newReadingInput.value);
        const calculatedValueWithUnit = calculatedMagnitude.value;

        if (!fecha || !instrumento || isNaN(lectura) || calculatedValueWithUnit.includes('--') || calculatedValueWithUnit.includes('Error')) {
            alert('Por favor, complete todos los campos correctamente antes de guardar.');
            return;
        }

        const magnitud_fisica = parseFloat(calculatedValueWithUnit);

        const newMeasurement = { fecha, instrumento, lectura, magnitud_fisica };
        
        // Store in both arrays
        measurements.push(newMeasurement);
        sessionReadings.push(newMeasurement);

        // Refresh data in other screens
        populateInstrumentList();
        populateInstrumentSelects();
        updateChart(instrumento);

        alert('Lectura guardada exitosamente (en la memoria de esta sesión).');
        showScreen('screen-instrument-selection');
        
        // Reset form
        newReadingInput.value = '';
        calculatedMagnitude.value = '--';
        newReadingInstrumentSelect.selectedIndex = 0;
    }
});