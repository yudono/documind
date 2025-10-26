// function to normalize text from markdown to plain text
export function normalizeText(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "") // hapus markdown heading (#, ##, ###, dst)
    .replace(/[*_~`>|]/g, "") // hapus karakter markdown umum
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // ubah [text](link) jadi "text"
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1") // ubah ![alt](img) jadi "alt"
    .replace(/\s+/g, " ") // normalize spasi berlebih
    .trim(); // hapus spasi di awal & akhir
}
