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
            fetch('db.json')
                .then(res => res.json())
                .then(dbData => {
                    const storedMeasurements = localStorage.getItem('measurements');
                    if (storedMeasurements) {
                        try {
                            measurements = JSON.parse(storedMeasurements);
                            const instrumentsFromDb = [...new Set(dbData.measurements.map(m => m.instrumento))];
                            const instrumentsFromStorage = [...new Set(measurements.map(m => m.instrumento))];
                            
                            // Check if instrument lists are different
                            if (instrumentsFromDb.length !== instrumentsFromStorage.length || !instrumentsFromDb.every(inst => instrumentsFromStorage.includes(inst))) {
                                console.log('Instrument list changed. Updating from db.json.');
                                measurements = dbData.measurements;
                                saveMeasurements();
                            } else {
                                console.log('Measurements loaded from localStorage.');
                            }
                        } catch (error) {
                            console.error('Error parsing measurements from localStorage. Falling back to db.json.', error);
                            measurements = dbData.measurements;
                            saveMeasurements();
                        }
                    } else {
                        console.log('No measurements in localStorage. Loading from db.json.');
                        measurements = dbData.measurements;
                        saveMeasurements();
                    }
                    resolve();
                })
                .catch(fetchError => {
                    console.error('Error fetching db.json:', fetchError);
                    // Attempt to load from localStorage as a last resort if db.json fails
                    const storedMeasurements = localStorage.getItem('measurements');
                    if (storedMeasurements) {
                        try {
                            measurements = JSON.parse(storedMeasurements);
                            console.log('Loaded from localStorage as fallback.');
                            resolve();
                        } catch (parseError) {
                            console.error('Failed to parse localStorage fallback:', parseError);
                            reject(fetchError); // Reject with the original fetch error
                        }
                    } else {
                        reject(fetchError);
                    }
                });
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
            const equationInstruments = equations.map(eq => eq.instrumento);

            setupNavigation();
            populateInstrumentSelects(allInstruments, equationInstruments);
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
            const newReadingInstruments = equations.map(eq => eq.instrumento);
            populateInstrumentSelects(filteredInstruments, newReadingInstruments);
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
    function populateInstrumentSelects(chartInstruments, newReadingInstruments) {
        const currentChartInstrument = instrumentSelectChart.value;
        const currentNewReadingInstrument = newReadingInstrumentSelect.value;

        instrumentSelectChart.innerHTML = '';
        newReadingInstrumentSelect.innerHTML = '<option disabled selected value="">Seleccionar Instrumento</option>';
        
        chartInstruments.forEach(instrument => {
            const option = new Option(instrument, instrument);
            instrumentSelectChart.add(option);
        });

        newReadingInstruments.forEach(instrument => {
            const option = new Option(instrument, instrument);
            newReadingInstrumentSelect.add(option);
        });

        if (chartInstruments.includes(currentChartInstrument)) {
            instrumentSelectChart.value = currentChartInstrument;
        } else if (chartInstruments.length > 0) {
            instrumentSelectChart.value = chartInstruments[0];
        }

        if (newReadingInstruments.includes(currentNewReadingInstrument)) {
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

        // Handle derived instrument names (e.g., "PD-ED(MD-MI)") to find base equation data
        const baseInstrumentName = instrumentName.includes('(') 
            ? instrumentName.substring(0, instrumentName.indexOf('(')) 
            : instrumentName;
        const equationData = equations.find(eq => eq.instrumento === baseInstrumentName);

        const unit = equationData ? equationData.unit : '';
        
        // Construct a more descriptive variable name for pendulums
        let variable = equationData ? equationData.variable : 'Magnitud';
        if (baseInstrumentName !== instrumentName) { // It's a derived pendulum name
            const component = instrumentName.substring(instrumentName.indexOf('(') + 1, instrumentName.indexOf(')'));
            variable = `${variable} ${component}`; // e.g., "Deformación MD-MI"
        }

        chartTitle.textContent = `${variable} (${unit}) vs. Fecha`;
        const latest = instrumentMeasurements[instrumentMeasurements.length - 1];
        if(latest && latest.magnitud_fisica != null) {
            latestMeasurement.textContent = `${latest.magnitud_fisica.toFixed(3)} ${unit}`;
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

        // Create and inject the container for pendulum-specific inputs
        const pendulumInputContainer = document.createElement('div');
        pendulumInputContainer.id = 'pendulum-inputs-container';
        pendulumInputContainer.style.display = 'none'; // Hidden by default
        newReadingInput.parentElement.insertAdjacentElement('afterend', pendulumInputContainer);

        // Create and inject the container for pendulum-specific results
        const pendulumResultContainer = document.createElement('div');
        pendulumResultContainer.id = 'pendulum-results-container';
        pendulumResultContainer.className = 'mt-4 text-center text-white';
        calculatedMagnitude.parentElement.appendChild(pendulumResultContainer);

        newReadingInput.addEventListener('input', calculateMagnitude);
        newReadingInstrumentSelect.addEventListener('change', handleInstrumentChange);
        saveReadingButton.addEventListener('click', saveNewReading);
    }

    function handleInstrumentChange() {
        const instrumentName = newReadingInstrumentSelect.value;
        if (!instrumentName) return;

        const equationData = equations.find(eq => eq.instrumento === instrumentName);
        const standardInputContainer = newReadingInput.parentElement;
        const pendulumInputContainer = document.getElementById('pendulum-inputs-container');
        const standardResultDisplay = calculatedMagnitude;
        const pendulumResultContainer = document.getElementById('pendulum-results-container');

        if (equationData && equationData.equations) { // It's a pendulum
            standardInputContainer.style.display = 'none';
            standardResultDisplay.style.display = 'none';
            pendulumInputContainer.style.display = 'block';
            pendulumResultContainer.style.display = 'block';

            if (!pendulumInputContainer.hasChildNodes()) {
                pendulumInputContainer.innerHTML = `
                    <div class="mb-4">
                        <label for="pendulum-l1" class="block text-sm font-medium text-slate-300 mb-1">Lectura L1</label>
                        <input type="number" id="pendulum-l1" class="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-[var(--primary-color)] focus:outline-none">
                    </div>
                    <div class="mb-4">
                        <label for="pendulum-l2" class="block text-sm font-medium text-slate-300 mb-1">Lectura L2</label>
                        <input type="number" id="pendulum-l2" class="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:ring-2 focus:ring-[var(--primary-color)] focus:outline-none">
                    </div>
                `;
                document.getElementById('pendulum-l1').addEventListener('input', calculateMagnitude);
                document.getElementById('pendulum-l2').addEventListener('input', calculateMagnitude);
            }
        } else { // It's a standard instrument
            standardInputContainer.style.display = 'block';
            standardResultDisplay.style.display = 'block';
            pendulumInputContainer.style.display = 'none';
            pendulumResultContainer.style.display = 'none';
        }
        calculateMagnitude(); // Trigger calculation with the new state
    }

    function calculateMagnitude() {
        const instrumentName = newReadingInstrumentSelect.value;
        const equationData = equations.find(eq => eq.instrumento === instrumentName);

        // Clear previous results
        const pendulumResultContainer = document.getElementById('pendulum-results-container');
        pendulumResultContainer.innerHTML = '';
        calculatedMagnitude.value = '--';

        if (!instrumentName || !equationData) {
            return;
        }

        if (equationData.equations) { // Pendulum logic
            const l1 = parseFloat(document.getElementById('pendulum-l1')?.value);
            const l2 = parseFloat(document.getElementById('pendulum-l2')?.value);

            if (isNaN(l1) || isNaN(l2)) {
                pendulumResultContainer.innerHTML = '<p class="text-slate-400">--</p>';
                return;
            }

            let resultsHTML = '';
            try {
                Object.entries(equationData.equations).forEach(([key, eq]) => {
                    const result = eval(eq.replace(/L1/g, l1).replace(/L2/g, l2));
                    resultsHTML += `<p class="mb-1"><span class="font-semibold">${key}:</span> ${result.toFixed(3)} ${equationData.unit}</p>`;
                });
                pendulumResultContainer.innerHTML = resultsHTML;
            } catch (error) {
                console.error('Error calculating pendulum magnitude:', error);
                pendulumResultContainer.innerHTML = '<p class="text-red-500">Error en cálculo</p>';
            }

        } else { // Standard instrument logic
            const reading = parseFloat(newReadingInput.value);
            if (isNaN(reading)) {
                calculatedMagnitude.value = '--';
                return;
            }
            try {
                const result = eval(equationData.equation.replace(/lectura/g, reading));
                calculatedMagnitude.value = `${result.toFixed(3)} ${equationData.unit}`;
            } catch (error) {
                console.error('Error calculating magnitude:', error);
                calculatedMagnitude.value = 'Error en cálculo';
            }
        }
    }

    function saveNewReading() {
        const fecha = newReadingDate.value;
        const instrumento = newReadingInstrumentSelect.value;
        const equationData = equations.find(eq => eq.instrumento === instrumento);

        if (!fecha || !instrumento || !equationData) {
            alert('Por favor, complete todos los campos correctamente antes de guardar.');
            return;
        }

        let firstInstrumentForChart = instrumento;

        if (equationData.equations) { // Pendulum logic
            const l1 = parseFloat(document.getElementById('pendulum-l1')?.value);
            const l2 = parseFloat(document.getElementById('pendulum-l2')?.value);

            if (isNaN(l1) || isNaN(l2)) {
                alert('Por favor, ingrese valores válidos para L1 y L2.');
                return;
            }

            let isFirst = true;
            Object.entries(equationData.equations).forEach(([key, eq]) => {
                const result = eval(eq.replace(/L1/g, l1).replace(/L2/g, l2));
                const derivedInstrumentName = `${instrumento}(${key})`;
                
                const newMeasurement = { 
                    fecha, 
                    instrumento: derivedInstrumentName, 
                    lectura: `L1:${l1}, L2:${l2}`, // Store for reference
                    magnitud_fisica: result 
                };

                measurements.push(newMeasurement);
                sessionReadings.push(newMeasurement);

                if (isFirst) {
                    firstInstrumentForChart = derivedInstrumentName;
                    isFirst = false;
                }
            });

        } else { // Standard instrument logic
            const lectura = parseFloat(newReadingInput.value);
            const calculatedValueWithUnit = calculatedMagnitude.value;

            if (isNaN(lectura) || calculatedValueWithUnit.includes('--') || calculatedValueWithUnit.includes('Error')) {
                alert('Por favor, complete todos los campos correctamente antes de guardar.');
                return;
            }
            const magnitud_fisica = parseFloat(calculatedValueWithUnit);
            const newMeasurement = { fecha, instrumento, lectura, magnitud_fisica };
            measurements.push(newMeasurement);
            sessionReadings.push(newMeasurement);
        }

        saveMeasurements();
        localStorage.setItem('sessionReadings', JSON.stringify(sessionReadings));

        allInstruments = getUniqueInstruments();
        const newReadingInstruments = equations.map(eq => eq.instrumento);
        populateInstrumentSelects(allInstruments, newReadingInstruments);
        
        alert('Lectura guardada exitosamente.');
        showScreen('screen-graph', firstInstrumentForChart);
        
        // Reset form
        newReadingInput.value = '';
        calculatedMagnitude.value = '--';
        if (document.getElementById('pendulum-l1')) {
            document.getElementById('pendulum-l1').value = '';
            document.getElementById('pendulum-l2').value = '';
        }
        document.getElementById('pendulum-results-container').innerHTML = '';
        newReadingInstrumentSelect.selectedIndex = 0;
        handleInstrumentChange(); // Hide pendulum fields if necessary
    }
});
