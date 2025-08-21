import { getAuth } from "firebase/auth";
import axios from "axios";

const API_BASE = process.env.REACT_APP_BASE_URL;

export const uploadCSRTemplate = async (file) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  // Get Firebase ID token for authorization
  const idToken = await user.getIdToken();

  // Prepare FormData for file upload
  const formData = new FormData();
  formData.append("file", file, file.name);

  try {
    const response = await axios.post(`${API_BASE}/api/upload`, formData, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000, // extend if backend takes longer
    });

    return response.data;
  } catch (err) {
    // Normalize Axios error
    if (err.response) {
      const payload = err.response.data;
      const message =
        payload?.detail ||
        payload?.message ||
        `Upload failed (${err.response.status})`;
      const error = new Error(message);
      error.status = err.response.status;
      error.payload = payload;
      throw error;
    }
    throw err;
  }
};


export const createCSRDocument = async (metadata, handleCloseModal) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) throw new Error("User not authenticated");

    const idToken = await user.getIdToken();

    const response = await axios.post(
      `${API_BASE}/api/create-document`,
      { metadata }, 
      {
        headers: { Authorization: `Bearer ${idToken}` },
      }
    );

    console.log("Document created:", response.data.document);

    if (handleCloseModal) handleCloseModal();
    return response.data.document;
  } catch (error) {
    console.error("Error creating document:", error);
    throw error;
  }
};


export const getDocuments = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const idToken = await user.getIdToken();

  try {
    const response = await axios.get(`${API_BASE}/api/documents`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    return response.data.documents;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};


export const getDocumentById = async (documentId) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const idToken = await user.getIdToken();

  try {
    const response = await axios.get(`${API_BASE}/api/documents/${documentId}`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log("the data we recive from backend",response.data)
    return response.data;
  } catch (error) {
    console.error("Error fetching document:", error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const idToken = await user.getIdToken();

  try {
    const response = await axios.delete(
      `${API_BASE}/api/documents/${documentId}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};

export const updateDocument = async (documentId, updatedDoc) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const idToken = await user.getIdToken();

  try {
    const response = await axios.put(
      `${API_BASE}/api/documents/${documentId}`,
      updatedDoc,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );
    return response.data.document;
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
};