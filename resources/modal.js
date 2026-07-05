const reportModal = document.querySelector("#reportModal");
const openReportModalBtn = document.querySelector("#openReportModalBtn");
const closeReportModalBtn = document.querySelector("#closeReportModalBtn");
const reportForm = document.querySelector("#reportForm");

const reportName = document.querySelector("#reportName");
const reportStaffMember = document.querySelector("#reportStaffMember");

const reportMonth = document.querySelector("#reportMonth");
const reportYear = document.querySelector("#reportYear");
const reportStatus = document.querySelector("#reportStatus");
const reportNotes = document.querySelector("#reportNotes");
const reportPassword = document.querySelector("#reportPassword");

const submitButton = document.querySelector("#submitReportButton");
const submitStatus = document.querySelector("#submitStatus");

let editingExistingReport = false;

if (openReportModalBtn) {
    openReportModalBtn.addEventListener("click", function () {
        openReportModal();
    });
}

if (closeReportModalBtn) {
    closeReportModalBtn.addEventListener("click", closeReportModal);
}

if (reportModal) {
    reportModal.addEventListener("click", function (event) {
        if (event.target === reportModal) {
            closeReportModal();
        }
    });
}

if (reportForm) {
    reportForm.addEventListener("submit", handleReportSubmit);
}

if (reportStaffMember) {
    reportStaffMember.addEventListener("change", populateExistingReportIfFound);
    reportStaffMember.addEventListener("input", populateExistingReportIfFound);
}

if (reportMonth) {
    reportMonth.addEventListener("change", populateExistingReportIfFound);
}

if (reportYear) {
    reportYear.addEventListener("input", populateExistingReportIfFound);
    reportYear.addEventListener("change", populateExistingReportIfFound);
}

async function handleReportSubmit(event) {
    event.preventDefault();

    const selectedName = getSelectedReportName();

    if (!selectedName) {
        alert("Please select a staff member first.");
        return;
    }

    if (!reportMonth.value || !reportYear.value || !reportStatus.value || !reportPassword.value) {
        alert("Please complete all required fields, including the staff password.");
        return;
    }

    setSubmitLoading(true);

    const reportData = {
        name: selectedName,
        reportMonth: Number(reportMonth.value),
        reportYear: Number(reportYear.value),
        status: reportStatus.value,
        notes: reportNotes.value.trim(),
        password: reportPassword.value
    };

    try {
        const result = await submitAccountabilityReport(reportData);

        if (!result.success) {
            throw new Error(result.error || "Submission failed.");
        }

        await refreshAccountabilityDataAfterSubmit(selectedName);

        closeReportModal();
        reportForm.reset();

        alert(result.updated
            ? "Accountability report updated."
            : "Accountability report submitted."
        );
    } catch (error) {
        console.error("Failed to submit report:", error);
        alert(error.message || "Failed to submit accountability report.");
    } finally {
        setSubmitLoading(false);
    }
}

function openReportModal(preselectedName = null) {
    if (!reportModal) {
        return;
    }

    const reportingPeriod = getCurrentReportingPeriod();

    const selectedName =
        preselectedName ||
        getSelectedStaffMemberName() ||
        "";

    if (reportName) {
        reportName.value = selectedName;
    }

    if (reportStaffMember) {
        reportStaffMember.value = selectedName;
    }

    reportMonth.value = reportingPeriod.month;
    reportYear.value = reportingPeriod.year;
    reportStatus.value = "";
    reportNotes.value = "";
    if (reportPassword) {
        reportPassword.value = "";
    }

    editingExistingReport = false;

    setSubmitLoading(false);
    updateSubmitButtonMode();
    populateExistingReportIfFound();

    reportModal.classList.remove("hidden");
}

function closeReportModal() {
    if (reportModal) {
        reportModal.classList.add("hidden");
    }
}

function populateExistingReportIfFound() {
    const selectedName = getSelectedReportName();
    const selectedMonth = Number(reportMonth.value);
    const selectedYear = Number(reportYear.value);

    if (!selectedName || !selectedMonth || !selectedYear) {
        editingExistingReport = false;
        updateSubmitButtonMode();
        return;
    }

    const existingReport = findExistingReport(
        selectedName,
        selectedMonth,
        selectedYear
    );

    if (!existingReport) {
        editingExistingReport = false;
        updateSubmitButtonMode();
        return;
    }

    editingExistingReport = true;

    reportStatus.value = existingReport.Status || "";
    reportNotes.value = existingReport.Notes || "";

    updateSubmitButtonMode();
}

function findExistingReport(name, month, year) {
    const reports = getCurrentReportsArray();

    return reports.find(function (report) {
        return (
            String(report.Name).trim().toLowerCase() === String(name).trim().toLowerCase() &&
            Number(report.ReportMonth) === month &&
            Number(report.ReportYear) === year
        );
    });
}

function getCurrentReportsArray() {
    if (typeof allReports !== "undefined" && Array.isArray(allReports)) {
        return allReports;
    }

    if (typeof hqReports !== "undefined" && Array.isArray(hqReports)) {
        return hqReports;
    }

    return [];
}

function getSelectedReportName() {
    if (reportStaffMember) {
        return reportStaffMember.value.trim();
    }

    if (reportName) {
        return reportName.value.trim();
    }

    return getSelectedStaffMemberName();
}

function getSelectedStaffMemberName() {
    if (
        typeof selectedStaffMember !== "undefined" &&
        selectedStaffMember &&
        selectedStaffMember.Name
    ) {
        return selectedStaffMember.Name;
    }

    return "";
}

async function refreshAccountabilityDataAfterSubmit(selectedName) {
    const updatedReports = await getAccountabilityReports();

    if (typeof allReports !== "undefined") {
        allReports = updatedReports;
    }

    if (typeof hqReports !== "undefined") {
        hqReports = updatedReports;
    }

    if (
        typeof loadStaffAccountability === "function" &&
        typeof selectedStaffMember !== "undefined" &&
        selectedStaffMember &&
        selectedStaffMember.Name
    ) {
        loadStaffAccountability(selectedStaffMember.Name);
    }

    if (typeof renderHqSummary === "function") {
        renderHqSummary();
    }

    if (typeof renderHqMatrix === "function") {
        renderHqMatrix();
    }

    if (typeof hqStaff !== "undefined" && typeof openStaffDetailModal === "function") {
        const matchingStaff = hqStaff.find(function (staff) {
            return staff.Name === selectedName;
        });

        const staffDetailModal = document.querySelector("#staffDetailModal");

        if (
            matchingStaff &&
            staffDetailModal &&
            !staffDetailModal.classList.contains("hidden")
        ) {
            openStaffDetailModal(matchingStaff);
        }
    }
}

function updateSubmitButtonMode() {
    if (!submitButton) {
        return;
    }

    submitButton.textContent = editingExistingReport
        ? "Update Report"
        : "Save Report";
}

function setSubmitLoading(isLoading) {
    if (!submitButton || !submitStatus) {
        return;
    }

    submitButton.disabled = isLoading;

    if (isLoading) {
        submitButton.textContent = editingExistingReport
            ? "Updating..."
            : "Submitting...";

        submitStatus.classList.remove("hidden");
    } else {
        submitStatus.classList.add("hidden");
        updateSubmitButtonMode();
    }
}