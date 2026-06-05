let hqStaff = [];
let hqReports = [];
let hqRows = [];

const hqReportingPeriod = document.querySelector("#hqReportingPeriod");

const totalStaffCount = document.querySelector("#totalStaffCount");
const accountedCount = document.querySelector("#accountedCount");
const excusedCount = document.querySelector("#excusedCount");
const pendingCount = document.querySelector("#pendingCount");
const unexcusedCount = document.querySelector("#unexcusedCount");

const statusFilter = document.querySelector("#statusFilter");
const hqAccountabilityBody = document.querySelector("#hqAccountabilityBody");

document.addEventListener("DOMContentLoaded", initHqDashboard);

statusFilter.addEventListener("change", function () {
    renderHqTable(statusFilter.value);
});

async function initHqDashboard() {
    try {
        const staffData = await getReferenceStaff();
        const reportData = await getAccountabilityReports();

        hqStaff = Array.isArray(staffData) ? staffData : [];
        hqReports = Array.isArray(reportData) ? reportData : [];

        buildHqRows();
        renderHqSummary();
        renderHqTable("All");
    } catch (error) {
        console.error("Failed to load HQ dashboard:", error);

        hqAccountabilityBody.innerHTML = `
      <tr>
        <td colspan="6">Failed to load accountability data.</td>
      </tr>
    `;
    }
}

function buildHqRows() {
    const reportingPeriod = getCurrentReportingPeriod();

    hqReportingPeriod.textContent =
        `${getMonthName(reportingPeriod.month)} ${reportingPeriod.year}`;

    hqRows = hqStaff.map(function (staff) {
        const report = hqReports.find(function (report) {
            return (
                report.Name === staff.Name &&
                Number(report.ReportMonth) === reportingPeriod.month &&
                Number(report.ReportYear) === reportingPeriod.year
            );
        });

        const status = calculateStatus(
            report,
            reportingPeriod.month,
            reportingPeriod.year
        );

        return {
            rank: staff.Rank || "-",
            name: staff.Name || "-",
            aoPosition: staff["AO Position"] || "-",
            status: status,
            submitted: report ? formatDate(report.Timestamp) : "-",
            notes: report ? report.Notes || "-" : "-"
        };
    });
}

function renderHqSummary() {
    totalStaffCount.textContent = hqRows.length;

    accountedCount.textContent = countByStatus("Accounted");
    excusedCount.textContent = countByStatus("Excused");
    pendingCount.textContent = countByStatus("Pending");
    unexcusedCount.textContent = countByStatus("Unexcused");
}

function renderHqTable(filterStatus) {
    hqAccountabilityBody.innerHTML = "";

    let rowsToRender = hqRows;

    if (filterStatus !== "All") {
        rowsToRender = hqRows.filter(function (row) {
            return row.status === filterStatus;
        });
    }

    if (rowsToRender.length === 0) {
        hqAccountabilityBody.innerHTML = `
      <tr>
        <td colspan="6">No staff members found for this filter.</td>
      </tr>
    `;
        return;
    }

    rowsToRender.forEach(function (row) {
        const tableRow = document.createElement("tr");

        tableRow.innerHTML = `
      <td>${row.rank}</td>
      <td>${row.name}</td>
      <td>${row.aoPosition}</td>
      <td>
        <span class="status-pill status-${row.status.toLowerCase()}">
          ${row.status}
        </span>
      </td>
      <td>${row.submitted}</td>
      <td>${row.notes}</td>
    `;

        hqAccountabilityBody.appendChild(tableRow);
    });
}

function countByStatus(status) {
    return hqRows.filter(function (row) {
        return row.status === status;
    }).length;
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