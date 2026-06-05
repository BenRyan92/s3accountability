let operationOverviewRows = [];
let allOperations = [];
let filteredOperations = [];
let validAos = [];

const operationOverviewBody = document.querySelector("#operationOverviewBody");

const totalOperations = document.querySelector("#totalOperations");
const totalAttendance = document.querySelector("#totalAttendance");
const averageAttendance = document.querySelector("#averageAttendance");
const mostRecentOperation = document.querySelector("#mostRecentOperation");

const gameFilter = document.querySelector("#gameFilter");
const monthFilter = document.querySelector("#monthFilter");
const operationTableBody = document.querySelector("#operationTableBody");

document.addEventListener("DOMContentLoaded", initOdiDashboard);

gameFilter.addEventListener("change", applyFilters);
monthFilter.addEventListener("change", applyFilters);

async function initOdiDashboard() {
    try {
        const overviewData = await getOperationOverview();
        const operationData = await getOperationInput();
        const staffData = await getReferenceStaff();

        operationOverviewRows = Array.isArray(overviewData)
            ? cleanOverviewRows(overviewData)
            : [];

        validAos = extractValidAos(staffData);

        allOperations = Array.isArray(operationData)
            ? cleanOperationData(operationData)
            : [];

        filteredOperations = [...allOperations];

        populateGameFilter();
        populateMonthFilter();

        applyFilters();
        renderOverviewTable();
    } catch (error) {
        console.error("Failed to load ODI data:", error);

        operationOverviewBody.innerHTML = `
      <tr>
        <td>Failed to load operation overview data.</td>
      </tr>
    `;

        operationTableBody.innerHTML = `
      <tr>
        <td colspan="9">Failed to load operation input data.</td>
      </tr>
    `;
    }
}

function extractValidAos(staffData) {
    if (!Array.isArray(staffData)) {
        return [];
    }

    const aos = staffData
        .map(function (staff) {
            return staff.AO ? String(staff.AO).trim() : "";
        })
        .filter(function (ao) {
            return ao !== "" && ao.toUpperCase() !== "HQ";
        });

    return [...new Set(aos)].sort();
}

function cleanOperationData(operations) {
    return operations.filter(function (operation) {
        const operationNameIsValid =
            operation.operationName &&
            String(operation.operationName).trim() !== "";

        const gameIsValid =
            operation.game &&
            validAos.includes(String(operation.game).trim());

        const date = parseOperationDate(operation.operationDate);

        return operationNameIsValid && gameIsValid && date;
    });
}

function cleanOverviewRows(rows) {
    return rows.filter(function (row) {
        return row.some(function (cell) {
            return String(cell).trim() !== "";
        });
    });
}

function populateGameFilter() {
    validAos.forEach(function (ao) {
        const option = document.createElement("option");
        option.value = ao;
        option.textContent = ao;

        gameFilter.appendChild(option);
    });
}

function populateMonthFilter() {
    const pastMonths = getPastTwelveMonths();

    pastMonths.forEach(function (period) {
        const option = document.createElement("option");

        option.value = `${period.year}-${period.month}`;
        option.textContent = `${getMonthName(period.month)} ${period.year}`;

        monthFilter.appendChild(option);
    });
}

function applyFilters() {
    const selectedGame = gameFilter.value;
    const selectedMonth = monthFilter.value;

    filteredOperations = allOperations.filter(function (operation) {
        const date = parseOperationDate(operation.operationDate);

        if (!date) {
            return false;
        }

        const gameMatches =
            selectedGame === "All" ||
            String(operation.game).trim() === selectedGame;

        let monthMatches = true;

        if (selectedMonth !== "All") {
            monthMatches =
                selectedMonth === `${date.getFullYear()}-${date.getMonth() + 1}`;
        } else {
            monthMatches = isWithinPastYear(date);
        }

        return gameMatches && monthMatches;
    });

    renderSummary();
    renderOperationTable();
}

function renderSummary() {
    const attendanceValues = filteredOperations.map(function (operation) {
        return Number(operation.attendance) || 0;
    });

    const attendanceTotal = attendanceValues.reduce(function (sum, value) {
        return sum + value;
    }, 0);

    const attendanceAverage =
        filteredOperations.length > 0
            ? Math.round(attendanceTotal / filteredOperations.length)
            : 0;

    totalOperations.textContent = filteredOperations.length;
    totalAttendance.textContent = attendanceTotal;
    averageAttendance.textContent = attendanceAverage;

    const newestOperation = getNewestOperation(filteredOperations);

    mostRecentOperation.textContent = newestOperation
        ? newestOperation.operationName
        : "-";
}

function renderOperationTable() {
    operationTableBody.innerHTML = "";

    if (filteredOperations.length === 0) {
        operationTableBody.innerHTML = `
      <tr>
        <td colspan="9">No operations found for this filter.</td>
      </tr>
    `;
        return;
    }

    const sortedOperations = [...filteredOperations].sort(function (a, b) {
        return parseOperationDate(b.operationDate) - parseOperationDate(a.operationDate);
    });

    sortedOperations.forEach(function (operation) {
        const row = document.createElement("tr");

        row.innerHTML = `
      <td>${formatDate(operation.operationDate)}</td>
      <td>${operation.game || "-"}</td>
      <td>${operation.operationName || "-"}</td>
      <td>${operation.attendance || "-"}</td>
      <td>${formatZuluTime(operation.operationTimeZulu)}</td>
      <td>${operation.oic || "-"}</td>
      <td>${operation.primaryMc || "-"}</td>
      <td>${operation.secondaryMc || "-"}</td>
      <td>${operation.tertiaryMc || "-"}</td>
    `;

        operationTableBody.appendChild(row);
    });
}

function renderOverviewTable() {
    operationOverviewBody.innerHTML = "";

    if (operationOverviewRows.length === 0) {
        operationOverviewBody.innerHTML = `
      <tr>
        <td>No overview data found. Check Apps Script action getOperationOverview.</td>
      </tr>
    `;
        return;
    }

    operationOverviewRows.forEach(function (row, rowIndex) {
        const tableRow = document.createElement("tr");

        if (isOverviewHeaderRow(row)) {
            tableRow.classList.add("odi-overview-header-row");
        }

        if (isOverviewYearSummaryRow(row)) {
            tableRow.classList.add("odi-overview-summary-row");
        }

        row.forEach(function (cell) {
            const cellElement = document.createElement(rowIndex === 0 ? "th" : "td");
            cellElement.textContent = cell || "";
            tableRow.appendChild(cellElement);
        });

        operationOverviewBody.appendChild(tableRow);
    });
}

function isOverviewHeaderRow(row) {
    return row.some(function (cell) {
        const value = String(cell).trim().toUpperCase();

        return (
            value === "TOTAL" ||
            validAos.map(function (ao) {
                return ao.toUpperCase();
            }).includes(value)
        );
    });
}

function isOverviewYearSummaryRow(row) {
    return row.some(function (cell) {
        const value = String(cell).trim().toUpperCase();

        return value.includes("YEAR") || value.includes("TOTAL");
    });
}

function getPastTwelveMonths() {
    const months = [];
    const today = new Date();

    let month = today.getMonth() + 1;
    let year = today.getFullYear();

    for (let i = 0; i < 12; i++) {
        months.push({
            month: month,
            year: year
        });

        month--;

        if (month === 0) {
            month = 12;
            year--;
        }
    }

    return months;
}

function isWithinPastYear(date) {
    const today = new Date();

    const startDate = new Date(
        today.getFullYear() - 1,
        today.getMonth(),
        1
    );

    const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59
    );

    return date >= startDate && date <= endDate;
}

function getNewestOperation(operations) {
    if (operations.length === 0) {
        return null;
    }

    return [...operations].sort(function (a, b) {
        return parseOperationDate(b.operationDate) - parseOperationDate(a.operationDate);
    })[0];
}

function parseOperationDate(dateValue) {
    if (!dateValue) {
        return null;
    }

    const date = new Date(dateValue);

    if (isNaN(date)) {
        return null;
    }

    return date;
}

function formatDate(dateValue) {
    const date = parseOperationDate(dateValue);

    if (!date) {
        return dateValue || "-";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function formatZuluTime(timeValue) {
    if (!timeValue) {
        return "-";
    }

    const rawValue = String(timeValue).trim();
    const digitsOnly = rawValue.replace(/\D/g, "");

    if (digitsOnly.length === 0) {
        return "-";
    }

    if (digitsOnly.length === 1) {
        return `0${digitsOnly}:00`;
    }

    if (digitsOnly.length === 2) {
        return `${digitsOnly.padStart(2, "0")}:00`;
    }

    if (digitsOnly.length === 3) {
        return `0${digitsOnly[0]}:${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.length >= 4) {
        return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2, 4)}`;
    }

    return rawValue;
}

function getMonthName(monthNumber) {
    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    return months[monthNumber - 1] || "-";
}