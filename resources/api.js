const API_URL = "https://script.google.com/macros/s/AKfycbyJmMei2KGQwJhnBoz92VNZ7pBYTcva-jCtvfeVbp-AGMD77gq4jB96H9ubsSsRJ3Oo/exec";

async function getReferenceStaff() {
    const response = await fetch(`${API_URL}?action=getReferenceStaff`);

    if (!response.ok) {
        throw new Error("Failed to load ReferenceStaff.");
    }

    return await response.json();
}

async function getAccountabilityReports() {
    const response = await fetch(`${API_URL}?action=getAccountabilityReports`);

    if (!response.ok) {
        throw new Error("Failed to load accountability reports.");
    }

    return await response.json();
}

async function submitAccountabilityReport(reportData) {
    const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "submitAccountabilityReport",
            data: reportData
        })
    });

    if (!response.ok) {
        throw new Error("Failed to submit accountability report.");
    }

    return await response.json();
}

async function getOperationInput() {
    const response = await fetch(`${API_URL}?action=getOperationInput`);

    if (!response.ok) {
        throw new Error("Failed to load operation input data.");
    }

    return await response.json();
}

async function getOperationOverview() {
    const response = await fetch(`${API_URL}?action=getOperationOverview`);

    if (!response.ok) {
        throw new Error("Failed to load operation overview data.");
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || "Failed to load operation overview data.");
    }

    return result.rows;
}