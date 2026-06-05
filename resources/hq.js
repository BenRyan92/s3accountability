let hqStaff = [];
let hqReports = [];
let hqPeriods = [];

const hqMatrixHead = document.querySelector("#hqMatrixHead");
const hqMatrixBody = document.querySelector("#hqMatrixBody");

const totalStaffCount = document.querySelector("#totalStaffCount");
const accountedCount = document.querySelector("#accountedCount");
const excusedCount = document.querySelector("#excusedCount");
const pendingCount = document.querySelector("#pendingCount");
const unexcusedCount = document.querySelector("#unexcusedCount");

const staffDetailModal = document.querySelector("#staffDetailModal");
const closeStaffDetailModalBtn = document.querySelector("#closeStaffDetailModalBtn");

const modalStaffName = document.querySelector("#modalStaffName");
const modalStaffRank = document.querySelector("#modalStaffRank");
const modalStaffAoPosition = document.querySelector("#modalStaffAoPosition");
const modalStaffJoinDate = document.querySelector("#modalStaffJoinDate");
const modalStaffLastAfsm = document.querySelector("#modalStaffLastAfsm");

const modalSixMonthOverview = document.querySelector("#modalSixMonthOverview");
const modalReportHistoryBody = document.querySelector("#modalReportHistoryBody");

document.addEventListener("DOMContentLoaded", initHqDashboard);

closeStaffDetailModalBtn.addEventListener("click", closeStaffDetailModal);

staffDetailModal.addEventListener("click", function (event) {
    if (event.target === staffDetailModal) {
        closeStaffDetailModal();
    }
});

async function initHqDashboard() {
    try {
        const staffData = await getReferenceStaff();
        const reportData = await getAccountabilityReports();

        hqStaff = Array.isArray(staffData) ? staffData : [];
        hqReports = Array.isArray(reportData) ? reportData : [];

        hqPeriods = getLastSixReportingPeriods();

        renderHqSummary();
        renderHqMatrix();
    } catch (error) {
        console.error("Failed to load HQ dashboard:", error);

        hqMatrixBody.innerHTML = `
      <tr>
        <td>Failed to load accountability data.</td>
      </tr>
    `;
    }
}

function renderHqSummary() {
    const currentPeriod = getCurrentReportingPeriod();

    const currentRows = hqStaff.map(function (staff) {
        const report = findReportForPeriod(
            staff.Name,
            currentPeriod.month,
            currentPeriod.year
        );

        return calculateStatus(report, currentPeriod.month, currentPeriod.year);
    });

    totalStaffCount.textContent = hqStaff.length;
    accountedCount.textContent = countStatus(currentRows, "Accounted");
    excusedCount.textContent = countStatus(currentRows, "Excused");
    pendingCount.textContent = countStatus(currentRows, "Pending");
    unexcusedCount.textContent = countStatus(currentRows, "Unexcused");
}

function renderHqMatrix() {
    renderMatrixHeader();
    renderMatrixBody();
}

function renderMatrixHeader() {
    hqMatrixHead.innerHTML = "";

    const headerRow = document.createElement("tr");

    headerRow.innerHTML = `
    <th class="sticky-staff-column">Staff Member</th>
  `;

    hqPeriods.forEach(function (period) {
        const th = document.createElement("th");

        th.innerHTML = `
      <span>${getMonthName(period.month).slice(0, 3)}</span>
      <small>${period.year}</small>
    `;

        headerRow.appendChild(th);
    });

    hqMatrixHead.appendChild(headerRow);
}

function renderMatrixBody() {
    hqMatrixBody.innerHTML = "";

    if (hqStaff.length === 0) {
        hqMatrixBody.innerHTML = `
      <tr>
        <td colspan="7">No staff members found.</td>
      </tr>
    `;
        return;
    }

    hqStaff.forEach(function (staff) {
        const row = document.createElement("tr");

        const staffCell = document.createElement("td");
        staffCell.classList.add("sticky-staff-column");

        const staffButton = document.createElement("button");
        staffButton.type = "button";
        staffButton.classList.add("staff-name-button");
        staffButton.textContent = `${staff.Rank || ""} ${staff.Name}`;

        staffButton.addEventListener("click", function () {
            openStaffDetailModal(staff);
        });

        const positionSmall = document.createElement("small");
        positionSmall.textContent = staff["AO Position"] || "-";

        staffCell.appendChild(staffButton);
        staffCell.appendChild(positionSmall);
        row.appendChild(staffCell);

        hqPeriods.forEach(function (period) {
            const report = findReportForPeriod(staff.Name, period.month, period.year);
            const status = calculateStatus(report, period.month, period.year);

            const statusCell = document.createElement("td");
            statusCell.classList.add("matrix-status-cell");

            statusCell.innerHTML = `
        <span class="matrix-status-dot matrix-${status.toLowerCase()}" title="${status}">
          ${getStatusShortLabel(status)}
        </span>
      `;

            row.appendChild(statusCell);
        });

        hqMatrixBody.appendChild(row);
    });
}

function openStaffDetailModal(staff) {
    const staffReports = hqReports.filter(function (report) {
        return report.Name === staff.Name;
    });

    modalStaffName.textContent = `${staff.Rank || ""} ${staff.Name}`;
    modalStaffRank.textContent = staff.Rank || "-";
    modalStaffAoPosition.textContent = staff["AO Position"] || "-";
    modalStaffJoinDate.textContent = staff["Join Date"] || "-";
    modalStaffLastAfsm.textContent = staff["Last AFSM"] || "-";

    renderModalSixMonthOverview(staffReports);
    renderModalReportHistory(staffReports);

    staffDetailModal.classList.remove("hidden");
}

function closeStaffDetailModal() {
    staffDetailModal.classList.add("hidden");
}

function renderModalSixMonthOverview(staffReports) {
    modalSixMonthOverview.innerHTML = "";

    const currentPeriod = getCurrentReportingPeriod();

    hqPeriods.forEach(function (period) {
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

        modalSixMonthOverview.appendChild(monthCard);
    });
}

function renderModalReportHistory(staffReports) {
    modalReportHistoryBody.innerHTML = "";

    if (staffReports.length === 0) {
        modalReportHistoryBody.innerHTML = `
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

        modalReportHistoryBody.appendChild(row);
    });
}

function findReportForPeriod(name, month, year) {
    return hqReports.find(function (report) {
        return (
            report.Name === name &&
            Number(report.ReportMonth) === month &&
            Number(report.ReportYear) === year
        );
    });
}

function countStatus(statusArray, status) {
    return statusArray.filter(function (item) {
        return item === status;
    }).length;
}

function getStatusShortLabel(status) {
    if (status === "Accounted") return "A";
    if (status === "Excused") return "E";
    if (status === "Pending") return "P";
    if (status === "Unexcused") return "U";

    return "-";
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