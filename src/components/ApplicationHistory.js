import { useEffect, useState } from "react";
import StatusDropdown from "./StatusDropdown";
import { getDaysAgo } from "@/utils/appliedTime";
import PDFCarousel from "./PDFCarousel";

// src/components/ApplicationHistory.js
export default function ApplicationHistory({ userId }) {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = sessionStorage.getItem("authToken");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setError("Missing authentication data");
        return;
      }

      const res = await fetch(`/api/applications?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setApplications(data);
    } catch (error) {
      setError(error.message);
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchApplications();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 p-4 text-center">Error: {error}</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No applications found. Start applying to see your history here!
      </div>
    );
  }

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Application History</h2>

      <div className="grid grid-cols-1 gap-y-4">
        {applications.map((app) => (
          <div
            key={app._id}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-shadow shadow-sm"
          >
            <div className="flex flex-col justify-between items-start gap-2">
              {/* Top row */}
              <div className="flex flex-col sm:flex-row justify-between w-full gap-2">
                <h3 className="font-medium text-lg">{app.subject}</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <StatusDropdown
                    value={app.status}
                    onChange={(e) =>
                      handleStatusUpdate(app._id, e.target.value)
                    }
                  />
                  <div
                    className="text-sm text-gray-500 cursor-help"
                    title={
                      "Applied At: " +
                      new Date(app.appliedAt).toLocaleDateString("en-GB")
                    }
                  >
                    {getDaysAgo(app.appliedAt)}
                  </div>
                </div>
              </div>

              {/* Emails */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>To: {app.mainEmails.join(", ")}</p>
                {app.ccEmails?.length > 0 && (
                  <p>CC: {app.ccEmails.join(", ")}</p>
                )}
                {app.bccEmails?.length > 0 && (
                  <p>BCC: {app.bccEmails.join(", ")}</p>
                )}
              </div>
            </div>

            {/* Toggle button */}
            <button
              onClick={() =>
                setSelectedApp(selectedApp?._id === app._id ? null : app)
              }
              className="text-blue-600 text-sm mt-2"
            >
              {selectedApp?._id === app._id ? "🔽 Hide Details" : "🔼 Show Details"}
            </button>

            {/* Detail section */}
            {selectedApp?._id === app._id && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <div>
                  <h4 className="font-medium mb-2">Cover Letter</h4>
                  <div
                    className="border rounded p-4 bg-white shadow-sm overflow-auto"
                    dangerouslySetInnerHTML={{ __html: app.coverLetter }}
                  />
                </div>

                {app.resumes?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Files</h4>
                    <PDFCarousel files={app.resumes} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
