const API_BASE_URL = process.env.REACT_APP_BASE_URL 

export const commentService = {
  // Get all comments for a document
  async getComments(documentId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },

  // Note: All comment operations (create, update, delete, reply) are now handled via WebSocket
  // This service is only used for initial comment loading
};
