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

    pinInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            pinSubmit.click();
        }
    });

    const downloadReportButton = document.getElementById('download-report-button');
    const instrumentSelectChart = document.getElementById('instrument-select-chart');

    const chartTitle = document.getElementById('chart-title');
    const latestMeasurement = document.getElementById('latest-measurement');
    const chartCanvas = document.getElementById('measurements-chart');
    const newReadingDate = document.getElementById('new-reading-date');
    const newReadingInput = document.getElementById('new-reading-input');

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
            
            populateInstrumentSelects(allInstruments);
            setupNewReadingForm();
            setupReportGenerator();
            setupChartInstrumentFilter();
            clearDataButton.addEventListener('click', clearStoredData);
            
            // Initial chart update
            const initialInstrument = allInstruments[0];
            if (initialInstrument) {
                instrumentSelectChart.value = initialInstrument;
                updateChart(initialInstrument);
                handleInstrumentChange(); // Also trigger form update
            }

        }).catch(error => {
            console.error("Failed to initialize the application:", error);
            alert("No se pudieron cargar los datos necesarios para la aplicación. Por favor, revise la consola para más detalles.");
        });
    }



    // --- INSTRUMENT HANDLING ---
    function getUniqueInstruments() {
        const instrumentNames = measurements.map(m => m.instrumento);
        return [...new Set(instrumentNames)];
    }

    function setupChartInstrumentFilter() {
        const instrumentPrefixSelect = document.getElementById('instrument-prefix-select');

        function filterInstruments() {
            const prefix = instrumentPrefixSelect.value;

            const filteredInstruments = allInstruments.filter(inst => {
                return prefix ? inst.startsWith(prefix) : true;
            });
            
            populateInstrumentSelects(filteredInstruments);
        }

        instrumentPrefixSelect.addEventListener('change', filterInstruments);
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
                
                // Add table headers
                reportContent += "Instrumento\tFecha\tLectura\tMagnitud Calculada\n";

                sessionReadings.forEach(reading => {
                    const equationData = equations.find(eq => eq.instrumento === reading.instrumento);
                    const unit = equationData ? equationData.unit : '';
                    
                    let magnitudeText = 'N/A';
                    if (typeof reading.magnitud_fisica === 'number' && !isNaN(reading.magnitud_fisica)) {
                        magnitudeText = `${reading.magnitud_fisica.toFixed(2)} ${unit}`;
                    }

                    reportContent += `${reading.instrumento}\t`;
                    reportContent += `${reading.fecha}\t`;
                    reportContent += `${reading.lectura}\t`;
                    reportContent += `${magnitudeText}\n`;
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

    // --- UI AND FORM ---

    function populateInstrumentSelects(instruments) {
        const currentInstrument = instrumentSelectChart.value;
        instrumentSelectChart.innerHTML = '';
        
        instruments.forEach(instrument => {
            const option = new Option(instrument, instrument);
            instrumentSelectChart.add(option);
        });

        if (instruments.includes(currentInstrument)) {
            instrumentSelectChart.value = currentInstrument;
        } else if (instruments.length > 0) {
            instrumentSelectChart.value = instruments[0];
        }
        instrumentSelectChart.dispatchEvent(new Event('change'));
    }

    instrumentSelectChart.addEventListener('change', (e) => {
        const instrumentName = e.target.value;
        updateChart(instrumentName);
        handleInstrumentChange();
    });

    function updateChart(instrumentName, previewPoint) {
        if (!instrumentName) {
            chartTitle.textContent = 'Seleccione un instrumento';
            latestMeasurement.textContent = '--';
            if (chart) chart.destroy();
            return;
        }

        const instrumentMeasurements = measurements
            .filter(m => m.instrumento === instrumentName)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        const baseInstrumentName = instrumentName.includes('(') 
            ? instrumentName.substring(0, instrumentName.indexOf('(')) 
            : instrumentName;
        const equationData = equations.find(eq => eq.instrumento === baseInstrumentName);

        const unit = equationData ? equationData.unit : '';
        
        let variable = equationData ? equationData.variable : 'Magnitud';
        if (baseInstrumentName !== instrumentName) {
            const component = instrumentName.substring(instrumentName.indexOf('(') + 1, instrumentName.indexOf(')'));
            variable = `${variable} ${component}`;
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

        if (previewPoint && !isNaN(previewPoint.magnitud_fisica)) {
            labels.push(previewPoint.fecha);
            data.push(previewPoint.magnitud_fisica);
        }

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
                    y: { beginAtZero: false, ticks: { color: '#92b7c9' }, grid: { color: '#325567' } },
                    x: { ticks: { color: '#92b7c9' }, grid: { color: 'transparent' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function setupNewReadingForm() {
        const dateLink = document.getElementById('date-link');

        dateLink.addEventListener('click', () => {
            try {
                newReadingDate.showPicker();
            } catch (error) {
                console.error("Error showing date picker: ", error);
            }
        });

        // Function to update the link text
        const updateDateLink = () => {
            const date = new Date(newReadingDate.value);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            dateLink.textContent = new Intl.DateTimeFormat('es-ES', options).format(date);
        };

        // Set initial date and link text
        if (!newReadingDate.value) {
            newReadingDate.value = new Date().toISOString().split('T')[0];
        }
        updateDateLink();

        // Update link when date changes
        newReadingDate.addEventListener('change', updateDateLink);

        const pendulumInputContainer = document.createElement('div');
        pendulumInputContainer.id = 'pendulum-inputs-container';
        pendulumInputContainer.className = 'space-y-4';
        pendulumInputContainer.style.display = 'none';
        newReadingInput.closest('.flex.gap-4').insertAdjacentElement('afterend', pendulumInputContainer);

        const pendulumResultContainer = document.createElement('div');
        pendulumResultContainer.id = 'pendulum-results-container';
        pendulumResultContainer.className = 'mt-4 text-center text-white';
        // Insert it after the pendulum inputs container
        pendulumInputContainer.insertAdjacentElement('afterend', pendulumResultContainer);

        newReadingInput.addEventListener('keyup', calculateMagnitude);
        saveReadingButton.addEventListener('click', saveNewReading);
    }

    function handleInstrumentChange() {
        const instrumentName = instrumentSelectChart.value;
        if (!instrumentName) return;

        const baseInstrumentName = instrumentName.includes('(')
            ? instrumentName.substring(0, instrumentName.indexOf('('))
            : instrumentName;
        const equationData = equations.find(eq => eq.instrumento === baseInstrumentName);

        const standardInputContainer = newReadingInput.closest('.flex-1.space-y-2');
        const pendulumInputContainer = document.getElementById('pendulum-inputs-container');
        const standardResultDisplay = calculatedMagnitude.closest('.flex-1.space-y-2');
        const pendulumResultContainer = document.getElementById('pendulum-results-container');

        if (equationData && equationData.equations) { // It's a pendulum
            standardInputContainer.style.display = 'none';
            standardResultDisplay.style.display = 'none';
            pendulumInputContainer.style.display = 'block';
            pendulumResultContainer.style.display = 'block';

            if (!pendulumInputContainer.hasChildNodes()) {
                pendulumInputContainer.innerHTML = `
                    <div class="flex gap-4">
                        <div class="flex-1 space-y-2">
                            <label for="pendulum-l1" class="text-sm font-medium text-gray-300">Lectura L1</label>
                            <input type="number" id="pendulum-l1" class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-md text-white focus:outline-0 focus:ring-2 focus:ring-primary-600 border-none bg-[#233c48] h-14 p-4 text-base font-normal">
                        </div>
                        <div class="flex-1 space-y-2">
                            <label for="pendulum-l2" class="text-sm font-medium text-gray-300">Lectura L2</label>
                            <input type="number" id="pendulum-l2" class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-md text-white focus:outline-0 focus:ring-2 focus:ring-primary-600 border-none bg-[#233c48] h-14 p-4 text-base font-normal">
                        </div>
                    </div>
                `;
                document.getElementById('pendulum-l1').addEventListener('keyup', calculateMagnitude);
                document.getElementById('pendulum-l2').addEventListener('keyup', calculateMagnitude);
            }
        } else { // It's a standard instrument
            standardInputContainer.style.display = 'block';
            standardResultDisplay.style.display = 'block';
            pendulumInputContainer.style.display = 'none';
            pendulumResultContainer.style.display = 'none';
        }
        calculateMagnitude();
    }

    function calculateMagnitude() {
        const instrumentName = instrumentSelectChart.value;
        const baseInstrumentName = instrumentName.includes('(')
            ? instrumentName.substring(0, instrumentName.indexOf('('))
            : instrumentName;
        const equationData = equations.find(eq => eq.instrumento === baseInstrumentName);

        const pendulumResultContainer = document.getElementById('pendulum-results-container');
        pendulumResultContainer.innerHTML = '';
        calculatedMagnitude.value = '--';

        if (!instrumentName || !equationData) {
            updateChart(instrumentName); // Clear preview
            return;
        }

        if (equationData.equations) { // Pendulum logic
            const l1 = parseFloat(document.getElementById('pendulum-l1')?.value);
            const l2 = parseFloat(document.getElementById('pendulum-l2')?.value);

            if (isNaN(l1) || isNaN(l2)) {
                pendulumResultContainer.innerHTML = '<p class="text-slate-400">--</p>';
                updateChart(instrumentName); // Clear preview
                return;
            }

            let resultsHTML = '';
            try {
                let firstKey = Object.keys(equationData.equations)[0];
                let firstResult = eval(equationData.equations[firstKey].replace(/L1/g, l1).replace(/L2/g, l2));
                
                Object.entries(equationData.equations).forEach(([key, eq]) => {
                    const result = eval(eq.replace(/L1/g, l1).replace(/L2/g, l2));
                    resultsHTML += `<p class="mb-1"><span class="font-semibold">${key}:</span> ${result.toFixed(3)} ${equationData.unit}</p>`;
                });
                pendulumResultContainer.innerHTML = resultsHTML;

                const previewPoint = {
                    fecha: newReadingDate.value,
                    magnitud_fisica: firstResult
                };
                updateChart(instrumentName, previewPoint);

            } catch (error) {
                console.error('Error calculating pendulum magnitude:', error);
                pendulumResultContainer.innerHTML = '<p class="text-red-500">Error en cálculo</p>';
                updateChart(instrumentName); // Clear preview
            }

        } else { // Standard instrument logic
            const reading = parseFloat(newReadingInput.value);
            if (isNaN(reading)) {
                calculatedMagnitude.value = '--';
                updateChart(instrumentName); // Clear preview
                return;
            }
            try {
                const result = eval(equationData.equation.replace(/lectura/g, reading));
                calculatedMagnitude.value = `${result.toFixed(3)} ${equationData.unit}`;
                
                const previewPoint = {
                    fecha: newReadingDate.value,
                    magnitud_fisica: result
                };
                updateChart(instrumentName, previewPoint);

            } catch (error) {
                console.error('Error calculating magnitude:', error);
                calculatedMagnitude.value = 'Error en cálculo';
                updateChart(instrumentName); // Clear preview
            }
        }
    }

    function saveNewReading() {
        const fecha = newReadingDate.value;
        const instrumento = instrumentSelectChart.value;
        const baseInstrumentName = instrumento.includes('(')
            ? instrumento.substring(0, instrumento.indexOf('('))
            : instrumento;
        const equationData = equations.find(eq => eq.instrumento === baseInstrumentName);

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
                const derivedInstrumentName = `${baseInstrumentName}(${key})`;
                
                const newMeasurement = { 
                    fecha, 
                    instrumento: derivedInstrumentName, 
                    lectura: `L1:${l1}, L2:${l2}`,
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
        const instrumentPrefixSelect = document.getElementById('instrument-prefix-select');
        const prefix = instrumentPrefixSelect.value;
        const filteredInstruments = allInstruments.filter(inst => {
            return prefix ? inst.startsWith(prefix) : true;
        });
        populateInstrumentSelects(filteredInstruments);
        
        alert('Lectura guardada exitosamente.');
        updateChart(firstInstrumentForChart);
        
        // Reset form
        newReadingInput.value = '';
        calculatedMagnitude.value = '--';
        if (document.getElementById('pendulum-l1')) {
            document.getElementById('pendulum-l1').value = '';
            document.getElementById('pendulum-l2').value = '';
        }
        document.getElementById('pendulum-results-container').innerHTML = '';
        handleInstrumentChange();
    }
});
