let allOperations = [];
let filteredOperations = [];
let validAos = [];

const operationOverviewBody = document.querySelector("#operationOverviewBody");

const thisYearTotalOperations = document.querySelector("#thisYearTotalOperations");
const thisYearAverageAttendance = document.querySelector("#thisYearAverageAttendance");
const recentReportedOperation = document.querySelector("#recentReportedOperation");

const overviewGameFilter = document.querySelector("#overviewGameFilter");
const overviewMonthFilter = document.querySelector("#overviewMonthFilter");

const gameFilter = document.querySelector("#gameFilter");
const monthFilter = document.querySelector("#monthFilter");
const operationTableBody = document.querySelector("#operationTableBody");

const openOdiReportModalBtn = document.querySelector("#openOdiReportModalBtn");
const closeOdiReportModalBtn = document.querySelector("#closeOdiReportModalBtn");
const odiReportModal = document.querySelector("#odiReportModal");
const odiReportForm = document.querySelector("#odiReportForm");

const odiOperationDate = document.querySelector("#odiOperationDate");
const odiGame = document.querySelector("#odiGame");
const odiOperationName = document.querySelector("#odiOperationName");
const odiAttendance = document.querySelector("#odiAttendance");
const odiOperationTimeZulu = document.querySelector("#odiOperationTimeZulu");
const odiOic = document.querySelector("#odiOic");
const odiPrimaryMc = document.querySelector("#odiPrimaryMc");
const odiSecondaryMc = document.querySelector("#odiSecondaryMc");
const odiTertiaryMc = document.querySelector("#odiTertiaryMc");

const submitOdiReportButton = document.querySelector("#submitOdiReportButton");
const odiSubmitStatus = document.querySelector("#odiSubmitStatus");

document.addEventListener("DOMContentLoaded", initOdiDashboard);

overviewGameFilter.addEventListener("change", renderGeneratedOverview);
overviewMonthFilter.addEventListener("change", renderGeneratedOverview);

gameFilter.addEventListener("change", applyFilters);
monthFilter.addEventListener("change", applyFilters);

openOdiReportModalBtn.addEventListener("click", openOdiReportModal);
closeOdiReportModalBtn.addEventListener("click", closeOdiReportModal);

odiReportModal.addEventListener("click", function (event) {
    if (event.target === odiReportModal) {
        closeOdiReportModal();
    }
});

odiReportForm.addEventListener("submit", handleOdiReportSubmit);

async function initOdiDashboard() {
    try {
        const operationData = await getOperationInput();
        const staffData = await getReferenceStaff();

        validAos = extractValidAos(staffData);

        allOperations = Array.isArray(operationData)
            ? cleanOperationData(operationData)
            : [];

        filteredOperations = [...allOperations];

        populateGameFilter();
        populateMonthFilter();

        applyFilters();
        renderGeneratedOverview();
        renderSummary();
    } catch (error) {
        console.error("Failed to load ODI data:", error);

        operationOverviewBody.innerHTML = `
      <p>Failed to load operation data.</p>
    `;

        operationTableBody.innerHTML = `
      <tr>
        <td colspan="9">Failed to load operation data.</td>
      </tr>
    `;
    }
}

function extractValidAos(staffData) {
    const manualAos = [
        "HLL Console",
        "BF6",
        "Foxhole",
        "Starter"
    ];

    let staffAos = [];

    if (Array.isArray(staffData)) {
        staffAos = staffData
            .map(function (staff) {
                return staff.AO ? String(staff.AO).trim() : "";
            })
            .filter(function (ao) {
                return ao !== "" && ao.toUpperCase() !== "HQ";
            });
    }

    return [...new Set([...staffAos, ...manualAos])].sort();
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

function populateGameFilter() {
    validAos.forEach(function (ao) {
        const historyOption = document.createElement("option");
        historyOption.value = ao;
        historyOption.textContent = ao;
        gameFilter.appendChild(historyOption);

        const overviewOption = document.createElement("option");
        overviewOption.value = ao;
        overviewOption.textContent = ao;
        overviewGameFilter.appendChild(overviewOption);

        const modalOption = document.createElement("option");
        modalOption.value = ao;
        modalOption.textContent = ao;
        odiGame.appendChild(modalOption);
    });
}

function populateMonthFilter() {
    const pastMonths = getPastTwelveMonths();

    pastMonths.forEach(function (period) {
        const value = `${period.year}-${period.month}`;
        const label = `${getMonthName(period.month)} ${period.year}`;

        const historyOption = document.createElement("option");
        historyOption.value = value;
        historyOption.textContent = label;
        monthFilter.appendChild(historyOption);

        const overviewOption = document.createElement("option");
        overviewOption.value = value;
        overviewOption.textContent = label;
        overviewMonthFilter.appendChild(overviewOption);
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
    const currentYear = new Date().getFullYear();

    const thisYearOperations = allOperations.filter(function (operation) {
        const date = parseOperationDate(operation.operationDate);

        return date && date.getFullYear() === currentYear;
    });

    const attendanceTotal = thisYearOperations.reduce(function (sum, operation) {
        return sum + (Number(operation.attendance) || 0);
    }, 0);

    const attendanceAverage =
        thisYearOperations.length > 0
            ? Math.round(attendanceTotal / thisYearOperations.length)
            : 0;

    const newestOperation = getNewestOperation(allOperations);

    if (thisYearTotalOperations) {
        thisYearTotalOperations.textContent = thisYearOperations.length;
    }

    if (thisYearAverageAttendance) {
        thisYearAverageAttendance.textContent = attendanceAverage;
    }

    if (recentReportedOperation) {
        recentReportedOperation.textContent = newestOperation
            ? newestOperation.operationName
            : "-";
    }
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

function renderGeneratedOverview() {
    operationOverviewBody.innerHTML = "";

    const selectedAo = overviewGameFilter.value;
    const selectedMonth = overviewMonthFilter.value;

    if (!selectedAo) {
        operationOverviewBody.innerHTML = `
      <div class="odi-empty-state">
        <h3>Select an overview</h3>
        <p>Please select either <strong>Total</strong> or one specific AO to display operation statistics.</p>
      </div>
    `;
        return;
    }

    const overviewOperations = allOperations.filter(function (operation) {
        const date = parseOperationDate(operation.operationDate);

        if (!date) {
            return false;
        }

        const aoMatches =
            selectedAo === "Total" ||
            String(operation.game).trim() === selectedAo;

        let monthMatches = true;

        if (selectedMonth !== "All") {
            monthMatches =
                selectedMonth === `${date.getFullYear()}-${date.getMonth() + 1}`;
        } else {
            monthMatches = isWithinPastYear(date);
        }

        return aoMatches && monthMatches;
    });

    if (overviewOperations.length === 0) {
        operationOverviewBody.innerHTML = `
      <div class="odi-empty-state">
        <h3>No data found</h3>
        <p>No operation data was found for the selected filter.</p>
      </div>
    `;
        return;
    }

    const table = document.createElement("table");
    table.classList.add("odi-summary-table");
    table.classList.add("odi-readable-table");

    table.innerHTML = `
    <thead>
      <tr>
        <th>Report</th>
        <th>Period</th>
        <th>Operations</th>
        <th>Total Attendance</th>
        <th>Average Attendance</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

    const tbody = table.querySelector("tbody");

    if (selectedMonth !== "All") {
        appendOverviewRow(tbody, selectedAo, selectedMonth, overviewOperations);
    } else {
        const pastMonths = getPastTwelveMonths();

        pastMonths.forEach(function (period) {
            const monthValue = `${period.year}-${period.month}`;

            const monthOperations = overviewOperations.filter(function (operation) {
                const date = parseOperationDate(operation.operationDate);

                return (
                    date &&
                    date.getFullYear() === period.year &&
                    date.getMonth() + 1 === period.month
                );
            });

            if (monthOperations.length > 0) {
                appendOverviewRow(tbody, selectedAo, monthValue, monthOperations);
            }
        });
    }

    operationOverviewBody.appendChild(table);
}

function appendOverviewRow(tbody, selectedAo, monthValue, operations) {
    const stats = calculateOperationStats(operations);
    const periodLabel = formatMonthValue(monthValue);

    const row = document.createElement("tr");
    row.classList.add("odi-overview-clickable-row");

    row.innerHTML = `
    <td>${selectedAo}</td>
    <td>${periodLabel}</td>
    <td>${stats.operations}</td>
    <td>${stats.attendance}</td>
    <td>${stats.average}</td>
  `;

    tbody.appendChild(row);

    if (selectedAo === "Total") {
        row.addEventListener("click", function () {
            toggleAoBreakdownRow(tbody, row, monthValue, operations);
        });
    }
}

function toggleAoBreakdownRow(tbody, parentRow, monthValue, operations) {
    const existingBreakdown = parentRow.nextElementSibling;

    if (
        existingBreakdown &&
        existingBreakdown.classList.contains("odi-breakdown-row")
    ) {
        existingBreakdown.remove();
        return;
    }

    const breakdownRow = document.createElement("tr");
    breakdownRow.classList.add("odi-breakdown-row");

    const breakdownCell = document.createElement("td");
    breakdownCell.colSpan = 5;

    const breakdownTable = document.createElement("table");
    breakdownTable.classList.add("odi-breakdown-table");

    breakdownTable.innerHTML = `
    <thead>
      <tr>
        <th>AO</th>
        <th>Operations</th>
        <th>Total Attendance</th>
        <th>Average Attendance</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

    const breakdownBody = breakdownTable.querySelector("tbody");

    validAos.forEach(function (ao) {
        const aoOperations = operations.filter(function (operation) {
            return String(operation.game).trim() === ao;
        });

        if (aoOperations.length === 0) {
            return;
        }

        const stats = calculateOperationStats(aoOperations);

        const row = document.createElement("tr");

        row.innerHTML = `
      <td>${ao}</td>
      <td>${stats.operations}</td>
      <td>${stats.attendance}</td>
      <td>${stats.average}</td>
    `;

        breakdownBody.appendChild(row);
    });

    breakdownCell.appendChild(breakdownTable);
    breakdownRow.appendChild(breakdownCell);

    parentRow.insertAdjacentElement("afterend", breakdownRow);
}

function calculateOperationStats(operations) {
    const attendance = operations.reduce(function (sum, operation) {
        return sum + (Number(operation.attendance) || 0);
    }, 0);

    return {
        operations: operations.length,
        attendance: attendance,
        average: operations.length > 0
            ? Math.round(attendance / operations.length)
            : 0
    };
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
        return parseOperationDate(b.timestamp) - parseOperationDate(a.timestamp);
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

    const rawValue = String(timeValue).trim().toUpperCase();

    const hasPm = rawValue.includes("PM");
    const hasAm = rawValue.includes("AM");

    if (rawValue.includes(":")) {
        const timePart = rawValue.match(/(\d{1,2}):(\d{2})/);

        if (!timePart) {
            return rawValue;
        }

        let hours = Number(timePart[1]);
        const minutes = timePart[2];

        if (hasPm && hours < 12) {
            hours += 12;
        }

        if (hasAm && hours === 12) {
            hours = 0;
        }

        return convertToAmPm(hours, minutes);
    }

    let digitsOnly = rawValue.replace(/\D/g, "");

    if (digitsOnly.length === 0) {
        return "-";
    }

    if (digitsOnly.length > 4) {
        digitsOnly = digitsOnly.slice(-4);
    }

    if (digitsOnly.length === 1) {
        digitsOnly = `0${digitsOnly}00`;
    } else if (digitsOnly.length === 2) {
        digitsOnly = `${digitsOnly}00`;
    } else if (digitsOnly.length === 3) {
        digitsOnly = `0${digitsOnly}`;
    }

    const hours = Number(digitsOnly.slice(0, 2));
    const minutes = digitsOnly.slice(2, 4) || "00";

    return convertToAmPm(hours, minutes);
}

function convertToAmPm(hours, minutes) {
    if (isNaN(hours)) {
        return "-";
    }

    const normalizedHours = hours % 24;
    const period = normalizedHours >= 12 ? "PM" : "AM";
    const displayHours =
        normalizedHours % 12 === 0 ? 12 : normalizedHours % 12;

    return `${String(displayHours).padStart(2, "0")}:${minutes} ${period}`;
}

function formatMonthValue(monthValue) {
    const parts = monthValue.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);

    return `${getMonthName(month)} ${year}`;
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

function openOdiReportModal() {
    odiReportForm.reset();
    setOdiSubmitLoading(false);
    odiReportModal.classList.remove("hidden");
}

function closeOdiReportModal() {
    odiReportModal.classList.add("hidden");
}

async function handleOdiReportSubmit(event) {
    event.preventDefault();

    setOdiSubmitLoading(true);

    const reportData = {
        operationDate: odiOperationDate.value,
        game: odiGame.value,
        operationName: odiOperationName.value.trim(),
        attendance: Number(odiAttendance.value),
        operationTimeZulu: odiOperationTimeZulu.value,
        oic: odiOic.value.trim(),
        primaryMc: odiPrimaryMc.value.trim(),
        secondaryMc: odiSecondaryMc.value.trim(),
        tertiaryMc: odiTertiaryMc.value.trim()
    };

    try {
        const result = await submitOdiReport(reportData);

        if (!result.success) {
            throw new Error(result.error || "ODI report submission failed.");
        }

        const operationData = await getOperationInput();

        allOperations = Array.isArray(operationData)
            ? cleanOperationData(operationData)
            : [];

        filteredOperations = [...allOperations];

        applyFilters();
        renderGeneratedOverview();
        renderSummary();

        closeOdiReportModal();
        alert("ODI report submitted.");
    } catch (error) {
        console.error("Failed to submit ODI report:", error);
        alert(error.message || "Failed to submit ODI report.");
    } finally {
        setOdiSubmitLoading(false);
    }
}

function setOdiSubmitLoading(isLoading) {
    submitOdiReportButton.disabled = isLoading;

    if (isLoading) {
        submitOdiReportButton.textContent = "Submitting...";
        odiSubmitStatus.classList.remove("hidden");
    } else {
        submitOdiReportButton.textContent = "Save ODI Report";
        odiSubmitStatus.classList.add("hidden");
    }
}