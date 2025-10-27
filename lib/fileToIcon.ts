// read from public/icons/ and create function fileToIcon
// Note: This function is designed for client-side use, so we can't use fs module
// Instead, we'll use a predefined list of available icons

const availableIcons = [
  "AI",
  "AVI",
  "BMP",
  "CRD",
  "CSV",
  "DLL",
  "DOC",
  "DOCX",
  "DWG",
  "EPS",
  "EXE",
  "FLV",
  "GIFF",
  "HTML",
  "ISO",
  "JAVA",
  "JPG",
  "JPEG",
  "MDB",
  "MID",
  "MOV",
  "MP3",
  "MP4",
  "MPEG",
  "PDF",
  "PNG",
  "PPT",
  "PS",
  "PSD",
  "PUB",
  "RAR",
  "RAW",
  "RSS",
  "SVG",
  "TIFF",
  "TXT",
  "WAV",
  "WMA",
  "XML",
  "XSL",
  "XLSX",
  "ZIP",
];

function fileToIcon(fileType: string): string {
  const upperFileType = fileType.toUpperCase();
  if (availableIcons.includes(upperFileType)) {
    return `/icons/${upperFileType}.svg`;
  }
  return "/icons/TXT.svg"; // Default fallback icon
}

export default fileToIcon;
