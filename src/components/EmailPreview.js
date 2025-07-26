export default function EmailPreview({ html }) {
  return (
    <div className="mt-6 p-6 border border-gray-200 rounded-xl bg-white shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-blue-700 border-b pb-2">
        📧 Email Preview
      </h2>
      <div
        className="prose max-w-none text-gray-800 text-sm overflow-auto"
        style={{ maxHeight: "400px" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
