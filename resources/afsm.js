let referenceStaff = [];
let activeMilpac = [];
let eligibleStaff = [];
let upcomingStaff = [];

const rankOrder = {
    GEN: 30,
    LTG: 29,
    MG: 28,
    BG: 27,

    COL: 26,
    LTC: 25,
    MAJ: 24,
    CPT: 23,
    "1LT": 22,
    "2LT": 21,

    CW5: 20,
    CW4: 19,
    CW3: 18,
    CW2: 17,
    WO1: 16,

    CSM: 15,
    SGM: 14,
    "1SG": 13,
    MSG: 12,
    SFC: 11,
    SSG: 10,
    SGT: 9,
    CPL: 8,

    SPC: 7,
    PFC: 6,
    PV2: 5,
    PVT: 4
};

const eligibleNowCount = document.querySelector("#eligibleNowCount");
const upcomingCount = document.querySelector("#upcomingCount");
const totalAfsmStaffCount = document.querySelector("#totalAfsmStaffCount");

const afsmEligibleBody = document.querySelector("#afsmEligibleBody");
const afsmBbcodeOutput = document.querySelector("#afsmBbcodeOutput");
const copyAfsmBbcodeBtn = document.querySelector("#copyAfsmBbcodeBtn");

document.addEventListener("DOMContentLoaded", initAfsmModule);

if (copyAfsmBbcodeBtn) {
    copyAfsmBbcodeBtn.addEventListener("click", copyAfsmBbcode);
}

async function initAfsmModule() {
    try {
        const staffData = await getReferenceStaff();
        const milpacData = await getReferenceActiveMilpac();

        referenceStaff = Array.isArray(staffData)
            ? cleanReferenceStaff(staffData)
            : [];

        activeMilpac = Array.isArray(milpacData)
            ? cleanMilpacData(milpacData)
            : [];

        calculateAfsmEligibility();
        renderAfsmSummary();
        renderEligibleTable();
        renderBbcodeOutput();
    } catch (error) {
        console.error("Failed to load AFSM module:", error);

        afsmEligibleBody.innerHTML = `
            <tr>
                <td colspan="5">Failed to load AFSM data.</td>
            </tr>
        `;

        afsmBbcodeOutput.value = "Failed to load AFSM data.";
    }
}

function cleanReferenceStaff(staffData) {
    return staffData.filter(function (staff) {
        return staff.Name && String(staff.Name).trim() !== "";
    });
}

function cleanMilpacData(milpacData) {
    return milpacData.filter(function (trooper) {
        return trooper.name && String(trooper.name).trim() !== "";
    });
}

function calculateAfsmEligibility() {
    const today = new Date();

    eligibleStaff = [];
    upcomingStaff = [];

    referenceStaff.forEach(function (staff) {
        const baseDate = getAfsmBaseDate(staff);

        if (!baseDate) {
            return;
        }

        const eligibleDate = addMonths(baseDate, 12);
        const daysUntilEligible = getDaysBetween(today, eligibleDate);
        const milpacRecord = findMilpacRecord(staff.Name);

        const record = {
            name: staff.Name,
            rank: staff.Rank || "-",
            fullName: milpacRecord ? milpacRecord.fullName : staff.Name,
            fullRank: milpacRecord ? milpacRecord.fullRank : staff.Rank || "-",
            milpacLink: milpacRecord ? milpacRecord.milpacLink : "",
            baseDate: baseDate,
            eligibleDate: eligibleDate,
            periodStart: baseDate,
            periodEnd: eligibleDate
        };

        if (daysUntilEligible <= 0) {
            eligibleStaff.push(record);
        } else if (daysUntilEligible <= 30) {
            upcomingStaff.push(record);
        }
    });

    sortByRankThenName(eligibleStaff);
    sortByRankThenName(upcomingStaff);
}

function getAfsmBaseDate(staff) {
    const joinDate = parseSheetDate(staff["Join Date"]);

    const lastAfsm =
        parseSheetDate(staff["Last AFSM"]) ||
        parseSheetDate(staff["Date of Last AFSM"]) ||
        parseSheetDate(staff["Last AFSM Date"]);

    if (!joinDate && !lastAfsm) {
        return null;
    }

    if (joinDate && !lastAfsm) {
        return joinDate;
    }

    if (!joinDate && lastAfsm) {
        return lastAfsm;
    }

    return joinDate > lastAfsm
        ? joinDate
        : lastAfsm;
}

function findMilpacRecord(name) {
    return activeMilpac.find(function (trooper) {
        return normalizeName(trooper.name) === normalizeName(name);
    });
}

function normalizeName(name) {
    return String(name || "").trim().toLowerCase();
}

function renderAfsmSummary() {
    eligibleNowCount.textContent = eligibleStaff.length;
    upcomingCount.textContent = upcomingStaff.length;
    totalAfsmStaffCount.textContent = referenceStaff.length;
}

function renderEligibleTable() {
    afsmEligibleBody.innerHTML = "";

    if (eligibleStaff.length === 0) {
        afsmEligibleBody.innerHTML = `
            <tr>
                <td colspan="5">No S3 staff currently eligible for AFSM recommendation.</td>
            </tr>
        `;
        return;
    }

    eligibleStaff.forEach(function (staff) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${getDisplayRank(staff)}</td>
            <td>${staff.fullName || staff.name}</td>
            <td>${formatDate(staff.periodStart)}</td>
            <td>${formatDate(staff.eligibleDate)}</td>
            <td>${renderMilpacLink(staff)}</td>
        `;

        afsmEligibleBody.appendChild(row);
    });
}

function renderMilpacLink(staff) {
    if (!staff.milpacLink) {
        return "-";
    }

    return `
        <a href="${staff.milpacLink}" target="_blank" class="afsm-link">
            Open Milpac
        </a>
    `;
}

function renderBbcodeOutput() {
    if (eligibleStaff.length === 0) {
        afsmBbcodeOutput.value = "No Troopers Require an AFSM";
        return;
    }

    const lines = [];

    lines.push("[CENTER][B][SIZE=5]Armed Forces Service Medal[/SIZE][/B]");
    lines.push("[IMG]https://wiki.7cav.us/images/0/0c/AFSM.jpg[/IMG]");
    lines.push("");
    lines.push("[B]Is awarded to:[/B]");

    eligibleStaff.forEach(function (staff) {
        lines.push(buildTrooperBbcodeLine(staff));
    });

    lines.push("");
    lines.push("Awarded for being assigned to a non-combat department and serving with distinction for a period of 12 consecutive months.");
    lines.push("");
    lines.push("[B]Congratulations![/B][/CENTER]");

    afsmBbcodeOutput.value = lines.join("\n");
}

function buildTrooperBbcodeLine(staff) {
    const displayRank = getDisplayRank(staff);
    const displayName = `${displayRank} ${staff.fullName || staff.name}`;
    const periodText =
        `for S3 Dept. ${formatPeriod(staff.periodStart)} to ${formatPeriod(staff.periodEnd)}`;

    if (staff.milpacLink) {
        return `[URL='${staff.milpacLink}']${displayName}[/URL]\n${periodText}\n`;
    }

    return `${displayName}\n${periodText}\n`;
}

async function copyAfsmBbcode() {
    const text = afsmBbcodeOutput.value;

    if (!text) {
        alert("No BBCode available to copy.");
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        alert("AFSM BBCode copied.");
    } catch (error) {
        console.error("Failed to copy BBCode:", error);
        afsmBbcodeOutput.select();
        document.execCommand("copy");
        alert("AFSM BBCode copied.");
    }
}

function sortByRankThenName(staffArray) {
    staffArray.sort(function (a, b) {
        const rankDifference = getRankValue(b) - getRankValue(a);

        if (rankDifference !== 0) {
            return rankDifference;
        }

        const nameA = String(a.fullName || a.name || "").toLowerCase();
        const nameB = String(b.fullName || b.name || "").toLowerCase();

        return nameA.localeCompare(nameB);
    });
}

function getRankValue(staff) {
    const rank = String(staff.rank || "").trim().toUpperCase();

    return rankOrder[rank] || 0;
}

function getDisplayRank(staff) {
    if (staff.fullRank && String(staff.fullRank).trim() !== "") {
        return staff.fullRank;
    }

    const rankMap = {
        PVT: "Private",
        PV2: "Private Second Class",
        PFC: "Private First Class",
        SPC: "Specialist",
        CPL: "Corporal",
        SGT: "Sergeant",
        SSG: "Staff Sergeant",
        SFC: "Sergeant First Class",
        MSG: "Master Sergeant",
        "1SG": "First Sergeant",
        SGM: "Sergeant Major",
        CSM: "Command Sergeant Major",
        WO1: "Warrant Officer 1",
        CW2: "Chief Warrant Officer 2",
        CW3: "Chief Warrant Officer 3",
        CW4: "Chief Warrant Officer 4",
        CW5: "Chief Warrant Officer 5",
        "2LT": "Second Lieutenant",
        "1LT": "First Lieutenant",
        CPT: "Captain",
        MAJ: "Major",
        LTC: "Lieutenant Colonel",
        COL: "Colonel",
        BG: "Brigadier General",
        MG: "Major General",
        LTG: "Lieutenant General",
        GEN: "General"
    };

    const shortRank = String(staff.rank || "").trim().toUpperCase();

    return rankMap[shortRank] || staff.rank || "-";
}

function parseSheetDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date && !isNaN(value)) {
        return value;
    }

    const rawValue = String(value).trim();

    if (!rawValue) {
        return null;
    }

    const parsedDate = new Date(rawValue);

    if (!isNaN(parsedDate)) {
        return parsedDate;
    }

    const parts = rawValue.split(/[./-]/);

    if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        let year = Number(parts[2]);

        if (year < 100) {
            year += 2000;
        }

        const date = new Date(year, month, day);

        if (!isNaN(date)) {
            return date;
        }
    }

    return null;
}

function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

function getDaysBetween(startDate, endDate) {
    const start = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
    );

    const end = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
    );

    const difference = end - start;

    return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
    if (!date || isNaN(date)) {
        return "-";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatPeriod(date) {
    const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC"
    ];

    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);

    return `${month}${year}`;
}