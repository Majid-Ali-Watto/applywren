// src/utils/uploadDocuments.js
export async function uploadFiles(resumes, userId) {
  const token = sessionStorage.getItem('authToken');
  if (!token || !userId) {
    throw new Error('Missing authentication data');
  }

  const uploadPromises = resumes.map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(",")[1];
          const response = await fetch("/api/documents", {
            method: "POST",
            headers: { 
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              userId,
              type: "file",
              name: file.name,
              content: base64,
            }),
          });
          
          const data = await response.json();
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  });

  try {
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading resumes:', error);
    throw error;
  }
}