import { NextRequest, NextResponse } from "next/server";
import { getCountryData } from "@/lib/data/loader";

export async function GET(req: NextRequest) {
  const iso3 = req.nextUrl.searchParams.get("iso3");

  if (!iso3 || typeof iso3 !== "string" || iso3.length !== 3) {
    return NextResponse.json(
      { error: "Missing or invalid 'iso3' query parameter (must be 3-letter ISO code)" },
      { status: 400 }
    );
  }

  try {
    const data = await getCountryData(iso3.toUpperCase());

    if (!data) {
      return NextResponse.json(
        { error: `No data found for country: ${iso3}` },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching country data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
