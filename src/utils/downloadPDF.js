import { safeHtml } from "./safeHtml";

// html2canvas (inside html2pdf) can't read the oklch() colors Tailwind CSS 4
// uses, so the letter is rendered with its own plain colors instead of
// inheriting the page's.
const LETTER_STYLE = "color:#0f172a;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5";
// Extra room below the last line; without it html2canvas cuts it in half.
const LETTER_PADDING = "padding-bottom:16pt";

export const handleDownloadPDF = async (letter) => {
  try {
    // Dynamically import html2pdf only when needed
    const html2pdf = (await import("html2pdf.js")).default;

    const element = document.createElement("div");
    element.setAttribute("style", `${LETTER_STYLE};${LETTER_PADDING}`);
    element.innerHTML = safeHtml(letter.content);

    const opt = {
      margin: 1,
      filename: `${letter.name}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: "#ffffff",
        // html2pdf wraps the letter in its own container, which inherits the
        // page body's colors; give the copy it renders plain ones.
        onclone: (doc) => {
          for (const node of [doc.documentElement, doc.body]) node.setAttribute("style", LETTER_STYLE);
        },
      },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    await html2pdf().from(element).set(opt).save();
  } catch (error) {
    console.error("PDF export failed:", error);
    throw new Error("Failed to generate PDF. Please try again.");
  }
};
