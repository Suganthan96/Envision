/**
 * The shared Google Drive folder teams upload their deck into. Hard-coded so
 * the "Open the shared Drive folder" link is always present regardless of
 * deploy-env config; `NEXT_PUBLIC_SUBMISSION_DRIVE_FOLDER_URL` can override
 * it without a code change.
 */
export const SUBMISSION_DRIVE_FOLDER_URL =
  process.env.NEXT_PUBLIC_SUBMISSION_DRIVE_FOLDER_URL ||
  "https://drive.google.com/drive/folders/1MnrgF85oCrEMXXydlxrpo_62l8Gyij4L"
