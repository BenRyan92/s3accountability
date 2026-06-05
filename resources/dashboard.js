let selectedStaffMember = null;
let allStaff = [];
let allReports = [];
let isDataLoaded = false;

const searchForm = document.querySelector("#searchForm");
const nameSearchInput = document.querySelector("#nameSearch");
const searchResults = document.querySelector("#searchResults");

const staffOverview = document.querySelector("#staffOverview");
const staffName = document.querySelector("#staffName");
const staffRank = document.querySelector("#staffRank");
const staffAoPosition = document.querySelector("#staffAoPosition");
const staffJoinDate = document.querySelector("#staffJoinDate");
const staffLastAfsm = document.querySelector("#staffLastAfsm");

const currentReportingPeriod = document.querySelector("#currentReportingPeriod");
const currentStatus = document.querySelector("#currentStatus");
const reportHistoryBody = document.querySelector("#reportHistoryBody");
const sixMonthOverview = document.querySelector("#sixMonthOverview");
const searchButton = document.querySelector("#searchButton");

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    setSearchLoading(true);
    isDataLoaded = false;

    try {
        const results = await Promise.all([
            getReferenceStaff(),
            getAccountabilityReports()
        ]);

        allStaff = results[0];
        allReports = results[1];

        console.log("Reference staff loaded:", allStaff);
        console.log("Accountability reports loaded:", allReports);

        isDataLoaded = true;
        setSearchLoading(false);
    } catch (error) {
        console.error("Failed to load dashboard data:", error);

        isDataLoaded = false;

        searchResults.classList.remove("hidden");
        searchResults.innerHTML =
            "<p>Failed to load data from Google Sheets. Please refresh the page.</p>";

        searchButton.textContent = "Data Load Failed";
        searchButton.disabled = true;
        nameSearchInput.disabled = true;
    }
}

function setSearchLoading(isLoading) {
    searchButton.disabled = isLoading;
    nameSearchInput.disabled = isLoading;

    if (isLoading) {
        searchButton.textContent = "Loading data...";
        nameSearchInput.placeholder = "Loading staff records...";
    } else {
        searchButton.textContent = "Search";
        nameSearchInput.placeholder = "Example: Ryan.BF or Ryan";
    }
}

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!isDataLoaded) {
        searchResults.classList.remove("hidden");
        searchResults.innerHTML =
            "<p>Accountability data is still loading. Please wait a moment.</p>";
        return;
    }

    const searchValue = nameSearchInput.value.trim().toLowerCase();

    if (!searchValue) {
        return;
    }

    const matches = allStaff.filter(function (staff) {
        return staff.Name && staff.Name.toLowerCase().includes(searchValue);
    });

    displaySearchResults(matches);
});

function displaySearchResults(matches) {
    searchResults.innerHTML = "";
    searchResults.classList.remove("hidden");

    if (matches.length === 0) {
        searchResults.innerHTML = "<p>No matching S3 staff member found.</p>";
        return;
    }

    matches.forEach(function (staff) {
        const resultButton = document.createElement("button");
        resultButton.type = "button";
        resultButton.classList.add("search-result-button");

        resultButton.textContent = `${staff.Rank || ""} ${staff.Name} - ${staff["AO Position"] || "No AO Position"}`;

        resultButton.addEventListener("click", function () {
            selectStaffMember(staff);
        });

        searchResults.appendChild(resultButton);
    });
}

function selectStaffMember(staff) {
    if (!isDataLoaded) {
        alert("Accountability data is still loading. Please wait a moment.");
        return;
    }

    selectedStaffMember = staff;

    staffName.textContent = `${staff.Rank || ""} ${staff.Name}`;
    staffRank.textContent = staff.Rank || "-";
    staffAoPosition.textContent = staff["AO Position"] || "-";
    staffJoinDate.textContent = staff["Join Date"] || "-";
    staffLastAfsm.textContent = staff["Last AFSM"] || "-";

    staffOverview.classList.remove("hidden");

    loadStaffAccountability(staff.Name);
}

function loadStaffAccountability(name) {
    const staffReports = allReports.filter(function (report) {
        return report.Name === name;
    });

    renderCurrentStatus(staffReports);
    renderSixMonthOverview(staffReports);
    renderReportHistory(staffReports);
}

function renderCurrentStatus(staffReports) {
    const reportingPeriod = getCurrentReportingPeriod();

    currentReportingPeriod.textContent =
        `${getMonthName(reportingPeriod.month)} ${reportingPeriod.year}`;

    const currentReport = staffReports.find(function (report) {
        return (
            Number(report.ReportMonth) === reportingPeriod.month &&
            Number(report.ReportYear) === reportingPeriod.year
        );
    });

    const calculatedStatus = calculateStatus(
        currentReport,
        reportingPeriod.month,
        reportingPeriod.year
    );

    currentStatus.textContent = calculatedStatus;

    currentStatus.className = "status-pill";
    currentStatus.classList.add(`status-${calculatedStatus.toLowerCase()}`);
}

function renderSixMonthOverview(staffReports) {
    sixMonthOverview.innerHTML = "";

    const periods = getLastSixReportingPeriods();
    const currentPeriod = getCurrentReportingPeriod();

    periods.forEach(function (period) {
        const report = staffReports.find(function (report) {
            return (
                Number(report.ReportMonth) === period.month &&
                Number(report.ReportYear) === period.year
            );
        });

        const status = calculateStatus(report, period.month, period.year);

        const monthCard = document.createElement("div");
        monthCard.classList.add("month-status-card");
        monthCard.classList.add(`month-status-${status.toLowerCase()}`);

        if (
            period.month === currentPeriod.month &&
            period.year === currentPeriod.year
        ) {
            monthCard.classList.add("current-reporting-month");
        }

        monthCard.innerHTML = `
      <span>${getMonthName(period.month).slice(0, 3)}</span>
      <strong>${status}</strong>
      <small>${period.year}</small>
    `;

        sixMonthOverview.appendChild(monthCard);
    });
}

function getLastSixReportingPeriods() {
    const periods = [];
    const currentPeriod = getCurrentReportingPeriod();

    let month = currentPeriod.month;
    let year = currentPeriod.year;

    for (let i = 0; i < 6; i++) {
        periods.push({
            month: month,
            year: year
        });

        month--;

        if (month === 0) {
            month = 12;
            year--;
        }
    }

    return periods.reverse();
}

function renderReportHistory(staffReports) {
    reportHistoryBody.innerHTML = "";

    if (staffReports.length === 0) {
        reportHistoryBody.innerHTML = `
      <tr>
        <td colspan="5">No accountability reports submitted yet.</td>
      </tr>
    `;
        return;
    }

    const sortedReports = [...staffReports].sort(function (a, b) {
        if (Number(b.ReportYear) !== Number(a.ReportYear)) {
            return Number(b.ReportYear) - Number(a.ReportYear);
        }

        return Number(b.ReportMonth) - Number(a.ReportMonth);
    });

    sortedReports.forEach(function (report) {
        const row = document.createElement("tr");

        row.innerHTML = `
      <td>${getMonthName(Number(report.ReportMonth))}</td>
      <td>${report.ReportYear}</td>
      <td>${report.Status}</td>
      <td>${formatDate(report.Timestamp)}</td>
      <td>${report.Notes || "-"}</td>
    `;

        reportHistoryBody.appendChild(row);
    });
}

function calculateStatus(report, reportMonth, reportYear) {
    if (report) {
        return report.Status;
    }

    const today = new Date();
    const deadline = getReportingDeadline(reportMonth, reportYear);

    if (today > deadline) {
        return "Unexcused";
    }

    return "Pending";
}

function getCurrentReportingPeriod() {
    const today = new Date();

    let month = today.getMonth();
    let year = today.getFullYear();

    if (month === 0) {
        month = 12;
        year -= 1;
    }

    return {
        month: month,
        year: year
    };
}

function getReportingDeadline(reportMonth, reportYear) {
    let deadlineMonth = reportMonth + 1;
    let deadlineYear = reportYear;

    if (deadlineMonth === 13) {
        deadlineMonth = 1;
        deadlineYear += 1;
    }

    return new Date(deadlineYear, deadlineMonth - 1, 15, 23, 59, 59);
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

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (isNaN(date)) {
        return dateValue;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}