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

const submitButton = document.querySelector("#submitReportButton");
const submitStatus = document.querySelector("#submitStatus");

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

async function handleReportSubmit(event) {
    event.preventDefault();

    const selectedName = getSelectedReportName();

    if (!selectedName) {
        alert("Please select a staff member first.");
        return;
    }

    setSubmitLoading(true);

    const reportData = {
        name: selectedName,
        reportMonth: Number(reportMonth.value),
        reportYear: Number(reportYear.value),
        status: reportStatus.value,
        notes: reportNotes.value.trim()
    };

    try {
        const result = await submitAccountabilityReport(reportData);

        if (!result.success) {
            throw new Error(result.error || "Submission failed.");
        }

        await refreshAccountabilityDataAfterSubmit(selectedName);

        closeReportModal();
        reportForm.reset();

        alert("Accountability report submitted.");
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

    setSubmitLoading(false);

    reportModal.classList.remove("hidden");
}

function closeReportModal() {
    if (reportModal) {
        reportModal.classList.add("hidden");
    }
}

function getSelectedReportName() {
    if (reportStaffMember) {
        return reportStaffMember.value;
    }

    if (reportName) {
        return reportName.value;
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

    if (typeof hqReports !== "undefined" && typeof openStaffDetailModal === "function") {
        const matchingStaff =
            typeof hqStaff !== "undefined"
                ? hqStaff.find(function (staff) {
                    return staff.Name === selectedName;
                })
                : null;

        if (matchingStaff) {
            // Refresh modal content only if the staff detail modal is currently open.
            const staffDetailModal = document.querySelector("#staffDetailModal");

            if (staffDetailModal && !staffDetailModal.classList.contains("hidden")) {
                openStaffDetailModal(matchingStaff);
            }
        }
    }
}

function setSubmitLoading(isLoading) {
    if (!submitButton || !submitStatus) {
        return;
    }

    submitButton.disabled = isLoading;

    if (isLoading) {
        submitButton.textContent = "Submitting...";
        submitStatus.classList.remove("hidden");
    } else {
        submitButton.textContent = "Save Report";
        submitStatus.classList.add("hidden");
    }
}