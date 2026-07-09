// Google Apps Script — receives chat logs and appends them to this spreadsheet.
// Setup: open a Google Sheet -> Extensions -> Apps Script -> paste this ->
// Deploy -> New deployment -> type "Web app" -> Execute as: Me,
// Who has access: Anyone -> Deploy -> copy the Web app URL (ends in /exec).
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Log') || ss.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Time', 'Question', 'Answer', 'Sources used']);
    }
    sheet.appendRow([ new Date(), data.question || '', data.answer || '', data.sources || '' ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
