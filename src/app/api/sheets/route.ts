import { NextRequest, NextResponse } from "next/server";
import { logSubmission, logDiagnosis, logContractors, initSheets } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  const { type, data } = await req.json();

  try {
    await initSheets(); // ensure headers exist

    switch (type) {
      case "submission":
        await logSubmission(data);
        break;
      case "diagnosis":
        await logDiagnosis(data);
        break;
      case "contractors":
        await logContractors(data.zip, data.tradeType, data.contractors);
        break;
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}