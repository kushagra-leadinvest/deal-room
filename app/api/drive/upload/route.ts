import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { driveConfigured, uploadToDrive } from "@/lib/drive";

const MAX_BYTES = 50 * 1024 * 1024;

/** Upload a deck to the shared Drive folder and store the link on the company. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!driveConfigured()) {
    return NextResponse.json({ error: "Drive isn't connected" }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const companyId = form?.get("companyId");
  if (!(file instanceof File) || typeof companyId !== "string") {
    return NextResponse.json({ error: "Missing file or company" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is over 50 MB" }, { status: 413 });
  }

  const { data: company } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  try {
    const { url } = await uploadToDrive(file, `${company.name} - ${file.name}`);
    const { error } = await supabase
      .from("decks")
      .insert({ company_id: companyId, url, file_name: file.name, source: "drive" });
    if (error) {
      return NextResponse.json({ error: `Uploaded to Drive but not saved: ${error.message}`, url }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Drive upload failed" }, { status: 502 });
  }
}
