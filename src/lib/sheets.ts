import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

const TABS = {
  SUBMISSIONS: "Submissions",
  DIAGNOSES: "Diagnoses",
  CONTRACTORS: "Contractors",
  NEGOTIATIONS: "Negotiations",
  CONVERSATIONS: "Conversations",
  PROFILES: "ContractorProfiles",
};

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function append(tab: string, row: (string | number)[]) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A:Z`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } catch (e) {
    console.error(`Sheets append [${tab}] error:`, e);
  }
}

async function getRows(tab: string): Promise<string[][]> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A:Z`,
    });
    return (res.data.values ?? []) as string[][];
  } catch (e) {
    console.error(`Sheets getRows [${tab}] error:`, e);
    return [];
  }
}

async function updateRow(tab: string, rowIndex: number, row: (string | number)[]) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A${rowIndex}:Z${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } catch (e) {
    console.error(`Sheets updateRow [${tab}] error:`, e);
  }
}

// ── 1. Log submission ─────────────────────────────────────────────────────────
export async function logSubmission(data: {
  ownerName: string; ownerPhone: string; address: string;
  zip: string; unit: string; tenantName: string;
  tenantPhone: string; issue: string; budget: number;
}) {
  await append(TABS.SUBMISSIONS, [
    new Date().toISOString(), data.ownerName, data.ownerPhone,
    data.address, data.zip, data.unit, data.tenantName,
    data.tenantPhone, data.issue, data.budget,
  ]);
}

// ── 2. Log diagnosis ──────────────────────────────────────────────────────────
export async function logDiagnosis(data: {
  ownerName: string; zip: string; issue: string;
  diagnosedIssue: string; tradeType: string; urgency: string;
  estimateMin: number; estimateMax: number;
  riskScore: number; isDIYable: boolean;
}) {
  await append(TABS.DIAGNOSES, [
    new Date().toISOString(), data.ownerName, data.zip, data.issue,
    data.diagnosedIssue, data.tradeType, data.urgency,
    data.estimateMin, data.estimateMax, data.riskScore,
    data.isDIYable ? "Yes" : "No",
  ]);
}

// ── 3. Log contractors found ──────────────────────────────────────────────────
export async function logContractors(
  zip: string,
  tradeType: string,
  contractors: { name: string; phone: string; rating: number; address: string; estimateMin: number; estimateMax: number }[]
) {
  for (const c of contractors) {
    await append(TABS.CONTRACTORS, [
      new Date().toISOString(), zip, tradeType,
      c.name, c.phone, c.rating, c.address,
      c.estimateMin, c.estimateMax,
    ]);
  }
}

// ── 4. Log negotiation result ─────────────────────────────────────────────────
export async function logNegotiation(data: {
  contractorName: string; contractorPhone: string;
  tradeType: string; zip: string; issue: string;
  originalMin: number; originalMax: number;
  negotiatedMin: number; negotiatedMax: number;
  saved: number; conversationId: string; callMode: string;
}) {
  await append(TABS.NEGOTIATIONS, [
    new Date().toISOString(), data.contractorName, data.contractorPhone,
    data.tradeType, data.zip, data.issue,
    data.originalMin, data.originalMax,
    data.negotiatedMin, data.negotiatedMax,
    data.saved, data.conversationId, data.callMode,
  ]);
}

// ── 5. Log conversation transcript ───────────────────────────────────────────
export async function logConversation(data: {
  conversationId: string; contractorName: string;
  contractorPhone: string; status: string; summary: string;
  transcript: string; finalAgreedPrice: string;
  pickedUp: boolean; callDurationSecs: number;
  attitude: "cooperative" | "resistant" | "refused" | "unknown";
  wasBooked: boolean;
}) {
  await append(TABS.CONVERSATIONS, [
    new Date().toISOString(), data.conversationId,
    data.contractorName, data.contractorPhone,
    data.status, data.summary, data.finalAgreedPrice,
    data.pickedUp ? "Yes" : "No",
    data.callDurationSecs,
    data.attitude,
    data.wasBooked ? "Yes" : "No",
    data.transcript,
  ]);

  // Also update the contractor's profile
  await updateContractorProfile({
    contractorName: data.contractorName,
    contractorPhone: data.contractorPhone,
    pickedUp: data.pickedUp,
    attitude: data.attitude,
    wasBooked: data.wasBooked,
    finalAgreedPrice: data.finalAgreedPrice,
    callDurationSecs: data.callDurationSecs,
  });
}

// ── 6. Update contractor profile (upsert) ────────────────────────────────────
export async function updateContractorProfile(data: {
  contractorName: string;
  contractorPhone: string;
  pickedUp: boolean;
  attitude: "cooperative" | "resistant" | "refused" | "unknown";
  wasBooked: boolean;
  finalAgreedPrice: string;
  callDurationSecs: number;
}) {
  try {
    const rows = await getRows(TABS.PROFILES);
    const header = rows[0] ?? [];
    const dataRows = rows.slice(1);

    // Find existing profile by phone number
    const existingIndex = dataRows.findIndex(
      (r) => r[1] === data.contractorPhone || r[0] === data.contractorName
    );

    const now = new Date().toISOString();

    if (existingIndex === -1) {
      // New contractor — create profile
      await append(TABS.PROFILES, [
        data.contractorName,
        data.contractorPhone,
        1,                                          // totalCalls
        data.pickedUp ? 1 : 0,                      // totalPickups
        data.pickedUp ? "100%" : "0%",              // pickupRate
        data.attitude === "cooperative" ? 1 : 0,    // cooperativeCount
        data.attitude === "resistant" ? 1 : 0,      // resistantCount
        data.attitude === "refused" ? 1 : 0,        // refusedCount
        data.wasBooked ? 1 : 0,                     // timesBooked
        data.finalAgreedPrice,                      // lastAgreedPrice
        data.callDurationSecs,                      // avgCallDurationSecs
        now,                                        // firstSeen
        now,                                        // lastSeen
        attitudeScore(data.attitude),               // attitudeScore (1-5)
        data.attitude,                              // lastAttitude
      ]);
    } else {
      // Existing contractor — update profile
      const r = dataRows[existingIndex];
      const totalCalls = parseInt(r[2] ?? "0") + 1;
      const totalPickups = parseInt(r[3] ?? "0") + (data.pickedUp ? 1 : 0);
      const pickupRate = Math.round((totalPickups / totalCalls) * 100) + "%";
      const cooperativeCount = parseInt(r[5] ?? "0") + (data.attitude === "cooperative" ? 1 : 0);
      const resistantCount = parseInt(r[6] ?? "0") + (data.attitude === "resistant" ? 1 : 0);
      const refusedCount = parseInt(r[7] ?? "0") + (data.attitude === "refused" ? 1 : 0);
      const timesBooked = parseInt(r[8] ?? "0") + (data.wasBooked ? 1 : 0);
      const prevAvgDuration = parseFloat(r[10] ?? "0");
      const newAvgDuration = Math.round((prevAvgDuration * (totalCalls - 1) + data.callDurationSecs) / totalCalls);

      // Attitude score = weighted average (cooperative=5, resistant=3, refused=1, unknown=3)
      const totalScored = cooperativeCount + resistantCount + refusedCount;
      const weightedScore = totalScored > 0
        ? Math.round(((cooperativeCount * 5) + (resistantCount * 3) + (refusedCount * 1)) / totalScored * 10) / 10
        : 3;

      await updateRow(TABS.PROFILES, existingIndex + 2, [ // +2 for header row + 1-indexed
        data.contractorName,
        data.contractorPhone,
        totalCalls,
        totalPickups,
        pickupRate,
        cooperativeCount,
        resistantCount,
        refusedCount,
        timesBooked,
        data.finalAgreedPrice,
        newAvgDuration,
        r[11] ?? now,   // firstSeen unchanged
        now,            // lastSeen updated
        weightedScore,
        data.attitude,
      ]);
    }
  } catch (e) {
    console.error("updateContractorProfile error:", e);
  }
}

function attitudeScore(attitude: string): number {
  return { cooperative: 5, resistant: 3, refused: 1, unknown: 3 }[attitude] ?? 3;
}

// ── Get contractor history for negotiation prompt ─────────────────────────────
export async function getContractorHistory(
  contractorName: string,
  tradeType: string,
  zip: string
): Promise<string> {
  const [negRows, profileRows] = await Promise.all([
    getRows(TABS.NEGOTIATIONS),
    getRows(TABS.PROFILES),
  ]);

  // Get last 5 negotiation records
  const negMatches = negRows
    .slice(1)
    .filter((row) => {
      const name = (row[1] ?? "").toLowerCase();
      const trade = (row[3] ?? "").toLowerCase();
      const zipCode = row[4] ?? "";
      return (
        name.includes(contractorName.toLowerCase().split(" ")[0]) &&
        trade === tradeType.toLowerCase() &&
        zipCode === zip
      );
    })
    .slice(-5);

  // Get profile data
  const profile = profileRows
    .slice(1)
    .find((r) => (r[0] ?? "").toLowerCase().includes(contractorName.toLowerCase().split(" ")[0]));

  let historyText = "";

  if (negMatches.length > 0) {
    historyText += "Previous negotiations:\n";
    historyText += negMatches
      .map(
        (row) =>
          `- ${new Date(row[0]).toLocaleDateString()}: quoted $${row[6]}–$${row[7]}, settled at $${row[8]}–$${row[9]} (saved $${row[10]})`
      )
      .join("\n");
  }

  if (profile) {
    const pickupRate = profile[4] ?? "unknown";
    const attitudeScore = profile[13] ?? "unknown";
    const lastAttitude = profile[14] ?? "unknown";
    const timesBooked = profile[8] ?? "0";
    const avgDuration = profile[10] ?? "unknown";

    historyText += `\n\nContractor profile:
- Pickup rate: ${pickupRate}
- Times previously booked: ${timesBooked}
- Negotiation attitude score: ${attitudeScore}/5 (last call: ${lastAttitude})
- Average call duration: ${avgDuration}s`;
  }

  return historyText.trim() || "No previous history with this contractor.";
}

// ── Mark a contractor as booked (called after user hits Book) ─────────────────
export async function markContractorBooked(contractorName: string, contractorPhone: string) {
  try {
    const rows = await getRows(TABS.PROFILES);
    const dataRows = rows.slice(1);
    const existingIndex = dataRows.findIndex(
      (r) => r[1] === contractorPhone || r[0] === contractorName
    );
    if (existingIndex === -1) return;

    const r = dataRows[existingIndex];
    const timesBooked = parseInt(r[8] ?? "0") + 1;
    const updated = [...r];
    updated[8] = String(timesBooked);
    updated[12] = new Date().toISOString(); // lastSeen
    await updateRow(TABS.PROFILES, existingIndex + 2, updated.map(v => v ?? ""));
  } catch (e) {
    console.error("markContractorBooked error:", e);
  }
}

// ── Init all sheet tabs with headers ──────────────────────────────────────────
export async function initSheets() {
  const headers: Record<string, string[]> = {
    [TABS.SUBMISSIONS]: ["Timestamp", "OwnerName", "OwnerPhone", "Address", "Zip", "Unit", "TenantName", "TenantPhone", "Issue", "Budget"],
    [TABS.DIAGNOSES]: ["Timestamp", "OwnerName", "Zip", "Issue", "DiagnosedIssue", "TradeType", "Urgency", "EstMin", "EstMax", "RiskScore", "IsDIYable"],
    [TABS.CONTRACTORS]: ["Timestamp", "Zip", "TradeType", "Name", "Phone", "Rating", "Address", "EstMin", "EstMax"],
    [TABS.NEGOTIATIONS]: ["Timestamp", "ContractorName", "ContractorPhone", "TradeType", "Zip", "Issue", "OrigMin", "OrigMax", "NegMin", "NegMax", "Saved", "ConversationId", "CallMode"],
    [TABS.CONVERSATIONS]: ["Timestamp", "ConversationId", "ContractorName", "ContractorPhone", "Status", "Summary", "FinalAgreedPrice", "PickedUp", "CallDurationSecs", "Attitude", "WasBooked", "Transcript"],
    [TABS.PROFILES]: ["ContractorName", "ContractorPhone", "TotalCalls", "TotalPickups", "PickupRate", "CooperativeCount", "ResistantCount", "RefusedCount", "TimesBooked", "LastAgreedPrice", "AvgCallDurationSecs", "FirstSeen", "LastSeen", "AttitudeScore", "LastAttitude"],
  };

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    for (const [tab, headerRow] of Object.entries(headers)) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A1:Z1`,
      });
      if ((res.data.values ?? []).length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${tab}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headerRow] },
        });
      }
    }
  } catch (e) {
    console.error("initSheets error:", e);
  }
}