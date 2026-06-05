let allOperations = [];
let filteredOperations = [];

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
        const operationData = await getOperationInput();

        allOperations = Array.isArray(operationData)
            ? cleanOperationData(operationData)
            : [];

        filteredOperations = [...allOperations];

        populateGameFilter();
        populateMonthFilter();

        renderSummary();
        renderOperationTable();
    } catch (error) {
        console.error("Failed to load ODI data:", error);

        operationTableBody.innerHTML = `
      <tr>
        <td colspan="9">Failed to load operation data.</td>
      </tr>
    `;
    }
}

function cleanOperationData(operations) {
    return operations.filter(function (operation) {
        return operation.operationName && String(operation.operationName).trim() !== "";
    });
}

function populateGameFilter() {
    const games = allOperations
        .map(function (operation) {
            return operation.game ? String(operation.game).trim() : "";
        })
        .filter(function (game) {
            return game !== "";
        });

    const uniqueGames = [...new Set(games)].sort();

    uniqueGames.forEach(function (game) {
        const option = document.createElement("option");
        option.value = game;
        option.textContent = game;

        gameFilter.appendChild(option);
    });
}

function populateMonthFilter() {
    const months = allOperations
        .map(function (operation) {
            const date = parseOperationDate(operation.operationDate);

            if (!date) {
                return "";
            }

            return `${date.getFullYear()}-${date.getMonth() + 1}`;
        })
        .filter(function (month) {
            return month !== "";
        });

    const uniqueMonths = [...new Set(months)].sort().reverse();

    uniqueMonths.forEach(function (monthValue) {
        const parts = monthValue.split("-");
        const year = Number(parts[0]);
        const month = Number(parts[1]);

        const option = document.createElement("option");
        option.value = monthValue;
        option.textContent = `${getMonthName(month)} ${year}`;

        monthFilter.appendChild(option);
    });
}

function applyFilters() {
    const selectedGame = gameFilter.value;
    const selectedMonth = monthFilter.value;

    filteredOperations = allOperations.filter(function (operation) {
        const gameMatches =
            selectedGame === "All" || String(operation.game).trim() === selectedGame;

        const date = parseOperationDate(operation.operationDate);
        let monthMatches = true;

        if (selectedMonth !== "All") {
            if (!date) {
                monthMatches = false;
            } else {
                monthMatches =
                    selectedMonth === `${date.getFullYear()}-${date.getMonth() + 1}`;
            }
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
        const dateA = parseOperationDate(a.operationDate);
        const dateB = parseOperationDate(b.operationDate);

        if (!dateA || !dateB) {
            return 0;
        }

        return dateB - dateA;
    });

    sortedOperations.forEach(function (operation) {
        const row = document.createElement("tr");

        row.innerHTML = `
      <td>${formatDate(operation.operationDate)}</td>
      <td>${operation.game || "-"}</td>
      <td>${operation.operationName || "-"}</td>
      <td>${operation.attendance || "-"}</td>
      <td>${operation.operationTimeZulu || "-"}</td>
      <td>${operation.oic || "-"}</td>
      <td>${operation.primaryMc || "-"}</td>
      <td>${operation.secondaryMc || "-"}</td>
      <td>${operation.tertiaryMc || "-"}</td>
    `;

        operationTableBody.appendChild(row);
    });
}

function getNewestOperation(operations) {
    if (operations.length === 0) {
        return null;
    }

    return [...operations].sort(function (a, b) {
        const dateA = parseOperationDate(a.operationDate);
        const dateB = parseOperationDate(b.operationDate);

        if (!dateA || !dateB) {
            return 0;
        }

        return dateB - dateA;
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
        month: "short",
        year: "numeric"
    });
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