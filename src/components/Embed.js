export default function Embed({
  src,
  type = "application/pdf",
  width = "100%",
  height = "100%", // changed from "500px" to make responsive
}) {
  return (
    <embed
      src={src}
      type={type}
      width={width}
      height={height}
      className="rounded border w-full h-full max-h-[75vh]"
    />
  );
}
