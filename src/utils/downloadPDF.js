export const handleDownloadPDF = async (letter) => {
  try {
    // Dynamically import html2pdf only when needed
    const html2pdf = (await import("html2pdf.js")).default;

    const element = document.createElement("div");
    element.innerHTML = letter.content;

    const opt = {
      margin: 1,
      filename: `${letter.name}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf().from(element).set(opt).save();
  } catch (error) {
    alert("Failed to generate PDF. Please try again.");
  }
};
