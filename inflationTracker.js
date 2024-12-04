let chart = null;  // Declare chart globally
let maxMonth = 9; //max date is October-2024
let maxYear = 2024;

async function loadData() {
    try {
        //const response = await fetch('https://themeasureofaplan.com/wp-content/uploads/2024/12/canadianInflation.csv');
        const response = await fetch('canadianInflation.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvData = await response.text();
        
        const rows = csvData.trim().split('\n');
        const headers = rows[0].split(',');
        const dates = headers.slice(2);
        const items = [];
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].split(',');
            if (row.length > 1) {
                items.push({
                    name: row[0],
                    category: row[1],
                    values: row.slice(2).map(v => parseFloat(v.trim()))
                });
            }
        }

        document.getElementById('loading').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

        initializeVisualization(dates, items);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').textContent = 'Error loading data: ' + error.message;
    }
}

function formatDate(dateStr) {
    const [month, day, year] = dateStr.split('/');
    return `${new Date(year, month - 1).toLocaleString('default', { month: 'short' })}-${year}`;
}

function getMonthDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function calculateCAGR(startValue, endValue, years) {
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

function initializeVisualization(dates, items) {
    if (!dates || !items || dates.length === 0 || items.length === 0) {
        console.error('Invalid data provided to initializeVisualization');
        return;
    }

    const startMonthSelect = document.getElementById('startMonth');
    const startYearSelect = document.getElementById('startYear');
    const endMonthSelect = document.getElementById('endMonth');
    const endYearSelect = document.getElementById('endYear');
    const itemSelects = [
        document.getElementById('item1'),
        document.getElementById('item2'),
        document.getElementById('item3'),
        document.getElementById('item4'),
        document.getElementById('item5')
    ];

    // Populate year dropdowns
    const years = [1978, 1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988,
      1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001,
      2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
      2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
    years.forEach(year => {
        startYearSelect.add(new Option(year, year));
        endYearSelect.add(new Option(year, year));
    });

    // Set default date range to Dec 2019 - Oct 2024
    startMonthSelect.value = "11"; // December
    startYearSelect.value = "2014";
    endMonthSelect.value = "9";    // October
    endYearSelect.value = "2024";

    // Group items by category
    const itemsByCategory = items.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {});

    // Populate item dropdowns
    itemSelects.forEach(select => {
        select.innerHTML = '<option value="">-- Select Item --</option>';
        Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
            const header = document.createElement('optgroup');
            header.label = category;
            select.add(header);

            categoryItems.forEach((item, index) => {
                const itemIndex = items.findIndex(i => i.name === item.name);
                select.add(new Option(item.name, itemIndex));
            });
        });
    });

    // Set default selected items
    const defaultItems = ['All-items (avg.)', 'Food (avg.)', 'Shelter (avg.)', 'Purchase of vehicles', 'City bus and subway transportation'];
    defaultItems.forEach((itemName, index) => {
        const itemIndex = items.findIndex(item => item.name === itemName);
        if (itemIndex !== -1) {
            itemSelects[index].value = itemIndex;
        }
    });

    // Initialize chart
    const ctx = document.getElementById('inflationChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '% Change vs. Start Date'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return '#000000';
                            }
                            return '#CCCCCC';
                        },
                        lineWidth: function(context) {
                            if (context.tick.value === 0) {
                                return 2;
                            }
                            return 1;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                },
                title: {
                    display: true,
                    color: "black",
                    text: "Canadian Inflation — Price Change % for Selected Items",
                    font: {
                      size: 18,
                    }
                }
            }
        }
    });

    function getDateIndex(month, year) {
      let searchStr;
      if(year > maxYear || (year == maxYear && month > maxMonth) ){
        searchStr = `${parseInt(maxMonth) + 1}/01/${maxYear}`;
      } else {
        searchStr = `${parseInt(month) + 1}/01/${year}`;
      }
      return dates.findIndex(date => date.includes(searchStr));
    }

    function updateChart() {
        const startIdx = getDateIndex(startMonthSelect.value, startYearSelect.value);
        const endIdx = getDateIndex(endMonthSelect.value, endYearSelect.value);
        
        if (startIdx === -1 || endIdx === -1) {
            console.error('Invalid date selection');
            return;
        }

        const selectedDates = dates.slice(startIdx, endIdx + 1);
        const datasets = [];
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        const tableBody = document.getElementById('changeTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';

        const startDateStr = formatDate(dates[startIdx]);
        const endDateStr = formatDate(dates[endIdx]);
        const monthDiff = getMonthDifference(dates[startIdx], dates[endIdx]);
        const yearDiff = Math.round( (monthDiff / 12)*10 ) / 10;
        const summaryDiv = document.getElementById('summary');
        summaryDiv.textContent = `Across the time period of ${startDateStr} to ${endDateStr} (${yearDiff} years), the price change for each item was:`;

        // Generate 2% reference line
        const referenceValues = [];
        const monthlyGrowthRate = Math.pow(1.02, 1/12);  // 2% annual growth converted to monthly
        for (let i = 0; i < selectedDates.length; i++) {
            referenceValues.push((Math.pow(monthlyGrowthRate, i) - 1) * 100);
        }

        // Add reference line dataset
        datasets.push({
            label: '2% Annual Growth Reference',
            data: referenceValues,
            borderColor: '#000000',
            backgroundColor: '#000000',
            fill: false,
            borderWidth: 1,
            borderDash: [5, 5],
            tension: 0
        });

        // Update table header
        const tableHeader = document.getElementById('changeTable').getElementsByTagName('thead')[0];
        tableHeader.innerHTML = `
            <tr>
                <th>Item</th>
                <th>Average Annual % Change</th>
                <th>Total % Change</th>
                <th>Price Difference vs. 2% Annual Inflation</th>
            </tr>
        `;

        let exampleItem = null;  // Store the first selected item for the example

        itemSelects.forEach((select, index) => {
            if (select.value !== '') {
                const item = items[select.value];
                const itemValues = item.values.slice(startIdx, endIdx + 1);
                const baseValue = item.values[startIdx];
                const rebasedValues = itemValues.map(value => ((value / baseValue) - 1) * 100);
                const totalChange = ((item.values[endIdx] / item.values[startIdx]) - 1) * 100;
                const years = monthDiff / 12;
                const annualizedChange = calculateCAGR(item.values[startIdx], item.values[endIdx], years);

                if (index === 0) {
                    exampleItem = {
                        name: item.name,
                        totalChange: totalChange
                    };
                }

                // Calculate 2% target value and difference
                const targetChange = (Math.pow(1.02, years) - 1) * 100;
                const actualEndValue = baseValue * (1 + totalChange/100);
                const targetEndValue = baseValue * (1 + targetChange/100);
                const targetDifference = ((actualEndValue - targetEndValue) / targetEndValue * 100);

                datasets.push({
                    label: item.name,
                    data: rebasedValues,
                    borderColor: colors[index],
                    backgroundColor: colors[index],
                    fill: false,
                    tension: 0.1
                });

                const row = tableBody.insertRow();
                let itemName = row.insertCell(0);
                itemName.className = "item"+index;
                itemName.textContent = item.name;
                row.insertCell(1).textContent = `${annualizedChange.toFixed(1)}%`;
                row.insertCell(2).textContent = `${totalChange.toFixed(1)}%`;
                row.insertCell(3).textContent = `${targetDifference > 0 ? '+' : ''}${targetDifference.toFixed(1)}%`;
            }
        });

        chart.data.labels = selectedDates.map(formatDate);
        chart.data.datasets = datasets;
        chart.update();

        // Add example sentence
        if (exampleItem) {
            const years = monthDiff / 12;
            const targetChange = (Math.pow(1.02, years) - 1) * 100;
            
            const exampleDiv = document.createElement('div');
            exampleDiv.classList.add('example-text');
            
            const actualCost = Math.round(1000 * (1 + exampleItem.totalChange/100));
            const targetCost = Math.round(1000 * (1 + targetChange/100));
            const priceDifference = ((actualCost - targetCost) / targetCost * 100).toFixed(1);
            const differenceText = priceDifference > 0 ? 'higher' : 'lower';
            let annualizedChange = (Math.pow(actualCost/1000,(1/years))-1) *100;

            exampleDiv.innerHTML =
            `<h3>Illustrative example for item: <span class="highlight-yellow">${exampleItem.name}</span></h3><ul><li>If you spent <span class="highlight-yellow">$1,000</span> in ${startDateStr}, as of ${endDateStr} that same purchase would now cost <span class="highlight-yellow">$${actualCost.toLocaleString()}</span>, a total increase of ${exampleItem.totalChange.toFixed(1)}% (${annualizedChange.toFixed(1)}% per year).</li><li>However, if inflation had been 2% per year over this time period, the cost would be <span class="highlight-yellow">$${targetCost.toLocaleString()}</span> instead.</li><li>Therefore, actual prices are <span class="highlight-yellow">${Math.abs(priceDifference)}% ${differenceText}</span> than they should be, versus a scenario with annual inflation of 2%.</li></ul>`;
            const tableContainer = document.getElementById('changeTable').parentNode;
            const existingExample = tableContainer.querySelector('.example-text');
            if (existingExample) {
                existingExample.remove();
            }
            tableContainer.appendChild(exampleDiv);
        }
    }

    // Add event listeners
    startMonthSelect.addEventListener('change', updateChart);
    startYearSelect.addEventListener('change', updateChart);
    endMonthSelect.addEventListener('change', updateChart);
    endYearSelect.addEventListener('change', updateChart);
    itemSelects.forEach(select => select.addEventListener('change', updateChart));

    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('startMonth')) {
        startMonthSelect.value = urlParams.get('startMonth');
        startYearSelect.value = urlParams.get('startYear');
        endMonthSelect.value = urlParams.get('endMonth');
        endYearSelect.value = urlParams.get('endYear');
        for (let i = 0; i < 5; i++) {
            const itemValue = urlParams.get(`item${i + 1}`);
            if (itemValue) {
                itemSelects[i].value = itemValue;
            }
        }
    }

    // Initial chart update
    updateChart();
}

function generateShareableLink() {
    const params = new URLSearchParams();
    params.set('startMonth', document.getElementById('startMonth').value);
    params.set('startYear', document.getElementById('startYear').value);
    params.set('endMonth', document.getElementById('endMonth').value);
    params.set('endYear', document.getElementById('endYear').value);
    
    for (let i = 1; i <= 5; i++) {
        const value = document.getElementById(`item${i}`).value;
        if (value) {
            params.set(`item${i}`, value);
        }
    }

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('Shareable link copied to clipboard!');
    });
}

// Start loading data when page loads
document.addEventListener('DOMContentLoaded', loadData);