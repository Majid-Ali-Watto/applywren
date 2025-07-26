export default function Chip({ title, onClick,className=null }) {
  console.log("🚀 ~ Chip ~ className:", className)
  return (
    <>
      <span
        onClick={onClick}
        className={className||"bg-gray-200 text-black hover:bg-gray-300 rounded p-2"}
      >
        {title}
      </span>
    </>
  );
}
