document.addEventListener('DOMContentLoaded', () => {
    const pinScreen = document.getElementById('pin-screen');
    const appContainer = document.getElementById('app-container');
    const pinInput = document.getElementById('pin-input');
    const pinSubmit = document.getElementById('pin-submit');
    const pinError = document.getElementById('pin-error');

    const correctPin = '1234';

    pinSubmit.addEventListener('click', () => {
        if (pinInput.value === correctPin) {
            pinScreen.style.display = 'none';
            appContainer.style.display = 'block';
            initializeApp();
        } else {
            pinError.style.display = 'block';
            pinInput.value = '';
        }
    });

    pinInput.addEventListener('input', () => {
        pinError.style.display = 'none';
    });
    const screens = {
        'screen-graph': document.getElementById('screen-graph'),
        'screen-new-reading': document.getElementById('screen-new-reading'),
    };

    const navButtons = document.querySelectorAll('.nav-button');
    const downloadReportButton = document.getElementById('download-report-button');
    const instrumentSelectChart = document.getElementById('instrument-select-chart');
    const searchInstrumentChartInput = document.getElementById('search-instrument-chart-input');
    const chartTitle = document.getElementById('chart-title');
    const latestMeasurement = document.getElementById('latest-measurement');
    const chartCanvas = document.getElementById('measurements-chart');
    const newReadingDate = document.getElementById('new-reading-date');
    const newReadingInput = document.getElementById('new-reading-input');
    const newReadingInstrumentSelect = document.getElementById('new-reading-instrument-select');
    const calculatedMagnitude = document.getElementById('calculated-magnitude');
    const saveReadingButton = document.getElementById('save-reading-button');
    const clearDataButton = document.getElementById('clear-data-button');

    let measurements = [];
    let equations = [];
    let sessionReadings = JSON.parse(localStorage.getItem('sessionReadings')) || []; // To store new readings for the report
    let chart = null;
    let allInstruments = [];

    // --- DATA LOADING ---
    function loadMeasurements() {
        return new Promise((resolve, reject) => {
            const storedMeasurements = localStorage.getItem('measurements');
            if (storedMeasurements) {
                try {
                    measurements = JSON.parse(storedMeasurements);
                    console.log('Measurements loaded from localStorage.');
                    resolve();
                } catch (error) {
                    console.error('Error parsing measurements from localStorage:', error);
                    // If parsing fails, fallback to fetching from db.json
                    fetch('db.json')
                        .then(res => res.json())
                        .then(dbData => {
                            measurements = dbData.measurements;
                            saveMeasurements(); // Save the fresh data to localStorage
                            console.log('Measurements loaded from db.json after parsing error.');
                            resolve();
                        })
                        .catch(fetchError => {
                            console.error('Error fetching db.json:', fetchError);
                            reject(fetchError);
                        });
                }
            } else {
                // Fetch from db.json if no data in localStorage
                fetch('db.json')
                    .then(res => res.json())
                    .then(dbData => {
                        measurements = dbData.measurements;
                        saveMeasurements(); // Save the fetched data to localStorage
                        console.log('Measurements loaded from db.json and saved to localStorage.');
                        resolve();
                    })
                    .catch(fetchError => {
                        console.error('Error fetching db.json:', fetchError);
                        reject(fetchError);
                    });
            }
        });
    }

    function saveMeasurements() {
        try {
            localStorage.setItem('measurements', JSON.stringify(measurements));
            console.log('Measurements saved to localStorage.');
        } catch (error) {
            console.error('Error saving measurements to localStorage:', error);
        }
    }
    
    function clearStoredData() {
        localStorage.removeItem('measurements');
        sessionReadings = []; // Also clear session readings
        alert('Los datos almacenados han sido eliminados. La aplicación se recargará.');
        location.reload();
    }




    function initializeApp() {
        Promise.all([
            loadMeasurements(),
            fetch('equations.json').then(res => res.json()),
        ]).then(([_, equationsData]) => {
            equations = equationsData.equations;
            allInstruments = getUniqueInstruments();
            
            setupNavigation();
            populateInstrumentSelects();
            setupNewReadingForm();
            setupReportGenerator();
            setupChartInstrumentFilter();
            clearDataButton.addEventListener('click', clearStoredData);
            showScreen('screen-graph');
        }).catch(error => {
            console.error("Failed to initialize the application:", error);
            alert("No se pudieron cargar los datos necesarios para la aplicación. Por favor, revise la consola para más detalles.");
        });
    }

    // --- NAVIGATION ---
    function setupNavigation() {
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const screenId = button.dataset.screen;
                if (screenId) {
                    const fromGraph = screens['screen-graph'].style.display === 'block';
                    const toNewReading = screenId === 'screen-new-reading';

                    if (fromGraph && toNewReading) {
                        const currentInstrument = instrumentSelectChart.value;
                        showScreen(screenId, currentInstrument);
                    } else {
                        showScreen(screenId);
                    }
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
            const targetInstrument = instrumentName || instrumentSelectChart.value || allInstruments[0];
            instrumentSelectChart.value = targetInstrument;
            updateChart(targetInstrument);
        } else if (screenId === 'screen-new-reading' && instrumentName) {
            newReadingInstrumentSelect.value = instrumentName;
            calculateMagnitude();
        }
    }

    // --- INSTRUMENT HANDLING ---
    function getUniqueInstruments() {
        const instrumentNames = measurements.map(m => m.instrumento);
        return [...new Set(instrumentNames)];
    }

    function setupChartInstrumentFilter() {
        searchInstrumentChartInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredInstruments = allInstruments.filter(inst => inst.toLowerCase().includes(searchTerm));
            populateInstrumentSelects(filteredInstruments);
        });
    }

        function clearStoredData() {
        localStorage.removeItem('measurements');
        localStorage.removeItem('sessionReadings');
        sessionReadings = []; // Also clear session readings
        alert('Los datos almacenados han sido eliminados. La aplicación se recargará.');
        location.reload();
    }

    // --- REPORT GENERATOR ---
    function setupReportGenerator() {
        downloadReportButton.addEventListener('click', () => {
            if (sessionReadings.length === 0) {
                alert('No hay nuevas lecturas para generar un reporte.');
                return;
            }

            try {
                const today = new Date().toISOString().split('T')[0];
                let reportContent = `Reporte de Mediciones - ${today}\n\n`;
                reportContent += "====================================\n";

                sessionReadings.forEach(reading => {
                    const equationData = equations.find(eq => eq.instrumento === reading.instrumento);
                    const unit = equationData ? equationData.unit : '';
                    
                    let magnitudeText = 'N/A';
                    if (typeof reading.magnitud_fisica === 'number' && !isNaN(reading.magnitud_fisica)) {
                        magnitudeText = `${reading.magnitud_fisica.toFixed(2)} ${unit}`;
                    }

                    reportContent += `Instrumento: ${reading.instrumento}\n`;
                    reportContent += `Fecha: ${reading.fecha}\n`;
                    reportContent += `Lectura: ${reading.lectura}\n`;
                    reportContent += `Magnitud Calculada: ${magnitudeText}\n`;
                    reportContent += "====================================\n";
                });

                const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `reporte-${today}.txt`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } catch (error) {
                console.error("Error generating report:", error);
                alert("Ocurrió un error al generar el reporte. Por favor, revise la consola para más detalles.");
            }
        });
    }

    // --- GRAPH SCREEN ---
    function populateInstrumentSelects(instruments = allInstruments) {
        const currentChartInstrument = instrumentSelectChart.value;
        const currentNewReadingInstrument = newReadingInstrumentSelect.value;

        instrumentSelectChart.innerHTML = '';
        newReadingInstrumentSelect.innerHTML = '<option disabled selected value="">Seleccionar Instrumento</option>';
        
        instruments.forEach(instrument => {
            const option1 = new Option(instrument, instrument);
            const option2 = new Option(instrument, instrument);
            instrumentSelectChart.add(option1);
            newReadingInstrumentSelect.add(option2);
        });

        if (instruments.includes(currentChartInstrument)) {
            instrumentSelectChart.value = currentChartInstrument;
        } else if (instruments.length > 0) {
            instrumentSelectChart.value = instruments[0];
        }

        if (instruments.includes(currentNewReadingInstrument)) {
            newReadingInstrumentSelect.value = currentNewReadingInstrument;
        }
    }

    instrumentSelectChart.addEventListener('change', (e) => {
        updateChart(e.target.value);
    });

    function updateChart(instrumentName) {
        if (!instrumentName) {
            chartTitle.textContent = 'Seleccione un instrumento';
            latestMeasurement.textContent = '--';
            if (chart) chart.destroy();
            return;
        }

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
        saveMeasurements(); // Save updated measurements to localStorage
        localStorage.setItem('sessionReadings', JSON.stringify(sessionReadings));

        // Refresh data in other screens
        allInstruments = getUniqueInstruments(); // Update all instruments list
        populateInstrumentSelects();
        updateChart(instrumento);

        alert('Lectura guardada exitosamente (en la memoria de esta sesión).');
        showScreen('screen-graph', instrumento);
        
        // Reset form
        newReadingInput.value = '';
        calculatedMagnitude.value = '--';
        newReadingInstrumentSelect.selectedIndex = 0;
    }
});
