const reportModal = document.querySelector("#reportModal");
const openReportModalBtn = document.querySelector("#openReportModalBtn");
const closeReportModalBtn = document.querySelector("#closeReportModalBtn");
const reportForm = document.querySelector("#reportForm");

const reportName = document.querySelector("#reportName");
const reportMonth = document.querySelector("#reportMonth");
const reportYear = document.querySelector("#reportYear");
const reportStatus = document.querySelector("#reportStatus");
const reportNotes = document.querySelector("#reportNotes");

const submitButton = document.querySelector("#submitReportButton");
const submitStatus = document.querySelector("#submitStatus");

openReportModalBtn.addEventListener("click", openReportModal);
closeReportModalBtn.addEventListener("click", closeReportModal);

reportModal.addEventListener("click", function (event) {
    if (event.target === reportModal) {
        closeReportModal();
    }
});

reportForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!selectedStaffMember) {
        alert("No staff member selected.");
        return;
    }

    setSubmitLoading(true);

    const reportData = {
        name: selectedStaffMember.Name,
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

        allReports = await getAccountabilityReports();
        loadStaffAccountability(selectedStaffMember.Name);

        closeReportModal();
        reportForm.reset();

        alert("Accountability report submitted.");
    } catch (error) {
        console.error("Failed to submit report:", error);
        alert("Failed to submit accountability report.");
    } finally {
        setSubmitLoading(false);
    }
});

function openReportModal() {
    if (!selectedStaffMember) {
        alert("Please select a staff member first.");
        return;
    }

    const reportingPeriod = getCurrentReportingPeriod();

    reportName.value = selectedStaffMember.Name;
    reportMonth.value = reportingPeriod.month;
    reportYear.value = reportingPeriod.year;
    reportStatus.value = "";
    reportNotes.value = "";

    setSubmitLoading(false);

    reportModal.classList.remove("hidden");
}

function closeReportModal() {
    reportModal.classList.add("hidden");
}

function setSubmitLoading(isLoading) {
    submitButton.disabled = isLoading;

    if (isLoading) {
        submitButton.textContent = "Submitting...";
        submitStatus.classList.remove("hidden");
    } else {
        submitButton.textContent = "Save Report";
        submitStatus.classList.add("hidden");
    }
}