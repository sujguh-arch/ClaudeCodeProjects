import { google } from "googleapis";
import type { Contact } from "../sources/types.js";
import { readFile } from "fs/promises";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const HEADER_ROW = [
  "Full Name",
  "First Name",
  "Last Name",
  "Title",
  "Company",
  "Email",
  "LinkedIn URL",
  "Seniority",
  "City",
  "State",
  "Country",
  "Found At",
  "Source",
];

export class SheetsWriter {
  private spreadsheetId: string;
  private credentialsPath: string;

  constructor(spreadsheetId: string, credentialsPath: string) {
    this.spreadsheetId = spreadsheetId;
    this.credentialsPath = credentialsPath;
  }

  private async getAuth() {
    const keyFile = JSON.parse(
      await readFile(this.credentialsPath, "utf-8")
    );
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: SCOPES,
    });
    return auth;
  }

  private async getSheets() {
    const auth = await this.getAuth();
    return google.sheets({ version: "v4", auth });
  }

  /**
   * Ensure the header row exists. If Sheet1 is empty, add headers.
   */
  async ensureHeaders(): Promise<void> {
    const sheets = await this.getSheets();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: "Sheet1!A1:M1",
    });

    const existingHeaders = res.data.values?.[0];
    if (!existingHeaders || existingHeaders.length === 0) {
      console.log("[sheets] Writing header row");
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: "Sheet1!A1:M1",
        valueInputOption: "RAW",
        requestBody: {
          values: [HEADER_ROW],
        },
      });
    }
  }

  /**
   * Append contacts as new rows to the sheet.
   */
  async appendContacts(contacts: Contact[]): Promise<number> {
    if (contacts.length === 0) {
      console.log("[sheets] No new contacts to append");
      return 0;
    }

    const sheets = await this.getSheets();
    await this.ensureHeaders();

    const rows = contacts.map((c) => [
      c.fullName,
      c.firstName,
      c.lastName,
      c.title,
      c.company,
      c.email ?? "",
      c.linkedinUrl ?? "",
      c.seniority,
      c.city ?? "",
      c.state ?? "",
      c.country ?? "",
      c.foundAt,
      c.source,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "Sheet1!A:M",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: rows,
      },
    });

    console.log(`[sheets] Appended ${rows.length} contacts`);
    return rows.length;
  }

  /**
   * Get all existing profile IDs from the sheet for dedup.
   * Reads the "Source" column to build a set of already-recorded contacts.
   */
  async getExistingNames(): Promise<Set<string>> {
    const sheets = await this.getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: "Sheet1!A:A",
    });

    const names = new Set<string>();
    const rows = res.data.values ?? [];
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) {
        names.add(rows[i][0].toLowerCase());
      }
    }
    return names;
  }
}
