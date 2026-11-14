const SPREADSHEET_ID = '14kCh3QYsA3OfGoqg1PijMc-uQcsOf9qWschntOa5UKc';
const RESPONSE_SHEET_NAME = 'Trang tính1';

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  const submissionId = String(params.submissionId || '');

  try {
    const driveUrl = String(params.driveUrl || params.driveLink || '').trim();
    if (!isGoogleDriveUrl(driveUrl)) {
      throw new Error('Link phải là link HTTPS từ drive.google.com hoặc docs.google.com.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(RESPONSE_SHEET_NAME);
      if (!sheet) {
        throw new Error('Không tìm thấy trang tính "' + RESPONSE_SHEET_NAME + '".');
      }

      const timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([
        timestamp,
        safeCell(params.studentName || params.name),
        safeCell(params.className),
        driveUrl
      ]);
    } finally {
      lock.releaseLock();
    }

    return createResponse(true, '', submissionId);
  } catch (error) {
    return createResponse(false, error.message || 'Không thể lưu dữ liệu.', submissionId);
  }
}

function isGoogleDriveUrl(value) {
  return /^https:\/\/(drive\.google\.com|docs\.google\.com)(\/|$)/i.test(value);
}

function safeCell(value) {
  const text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function createResponse(success, message, submissionId) {
  const payload = JSON.stringify({
    type: 'drive-submission-result',
    success: success,
    message: message,
    submissionId: submissionId
  }).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><body><script>window.top.postMessage(' +
    payload + ', "*");</script></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
