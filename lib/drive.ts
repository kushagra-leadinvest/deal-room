/** True when every env var the Drive upload needs is set. */
export function driveConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );
}

/** Exchange the stored refresh token for a short-lived access token. */
async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status})`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google token refresh returned no access token");
  return json.access_token;
}

/**
 * Upload a file to the shared Drive folder (multipart upload, no SDK so it
 * runs on Cloudflare Workers). Returns the file's web link.
 */
export async function uploadToDrive(file: File, name: string): Promise<{ url: string; id: string }> {
  const token = await accessToken();
  const boundary = `dealroom${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({
    name,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    await file.arrayBuffer(),
    `\r\n--${boundary}--`,
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) throw new Error(`Drive upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { id: string; webViewLink?: string };
  return { id: json.id, url: json.webViewLink ?? `https://drive.google.com/file/d/${json.id}/view` };
}
