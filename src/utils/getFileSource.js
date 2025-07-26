export const getFileSource = (file) => {
  if (typeof file === "string") {
    return `data:application/pdf;base64,${file}`;
  } else if (file.base64) {
    return `data:application/pdf;base64,${file.base64}`;
  }
  return URL.createObjectURL(file);
};
