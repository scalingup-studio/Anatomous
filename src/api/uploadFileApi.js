import { authRequest } from "./apiClient";
import { CUSTOM_ENDPOINTS } from "./apiConfig";

/**
 * Map MIME types to allowed file types
 * Note: Server expects: 'pdf' as the only allowable value for file_type
 */
const getFileType = (mimeType) => {
  const typeMap = {
    'application/pdf': 'pdf',
    'image/jpeg': 'pdf', // Map images to pdf as per API requirements
    'image/jpg': 'pdf',
    'image/png': 'pdf',
    'application/msword': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'pdf',
    'text/plain': 'pdf'
  };
  
  return typeMap[mimeType] || 'pdf';
};

export const UploadFileApi = {
  /**
   * Upload file to server
   */
  async uploadFile(file, userId, category = 'other', fileName = null) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", userId);
      const allowedCategories = new Set(['medical','insurance','lab','other','Labs','profile']);
      const safeCategory = allowedCategories.has(category) ? category : 'other';
      formData.append("category", safeCategory);
      
      const allowedFileType = getFileType(file.type);
      formData.append("file_type", allowedFileType);
      formData.append("file_name", fileName || file.name);

      return await authRequest(CUSTOM_ENDPOINTS.uploudFile.uploudFile, {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(file, userId) {
    try {
      const formData = new FormData();
      // Some backends expect field name `image` instead of `file`
      formData.append("file", file);
      formData.append("image", file);
      if (userId) formData.append("user_id", userId);
      // Keep payload minimal for avatar endpoint; many backends reject file_type here
      formData.append("file_name", file.name || "avatar.jpg");

      return await authRequest(CUSTOM_ENDPOINTS.uploudFile.avatarUpload, {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  /**
   * Get all uploaded files for a specific user with optional filter parameters
   * @param {string} userId - User ID
   * @param {Object} filterParams - Optional filter parameters
   * @param {string} filterParams.filename - Search by file name (partial match)
   * @param {string} filterParams.start_date - Filter files from this date (YYYY-MM-DD format)
   * @param {string} filterParams.end_date - Filter files to this date (YYYY-MM-DD format)
   */
  async getUserFiles(userId, filterParams = {}) {
    try {
      // Build query string from filter parameters
      const queryParams = new URLSearchParams();
      queryParams.append('user_id', userId);
      
      // Add filter parameters (only non-empty values)
      if (filterParams.filename) queryParams.append('filename', filterParams.filename);
      if (filterParams.start_date) queryParams.append('start_date', filterParams.start_date);
      if (filterParams.end_date) queryParams.append('end_date', filterParams.end_date);
      
      const url = `${CUSTOM_ENDPOINTS.uploudFile.getUserUploudFiles}?${queryParams.toString()}`;
      const response = await authRequest(url);
      
      // Sort files by date (newest first)
      const filesArray = response?.result || response || [];
      if (Array.isArray(filesArray) && filesArray.length > 0) {
        const sortedFiles = filesArray.sort((a, b) => {
          const dateA = a.uploaded_at || a.created_at || a.date || '';
          const dateB = b.uploaded_at || b.created_at || b.date || '';
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return new Date(dateB) - new Date(dateA);
        });
        
        // Return response with sorted files
        if (response?.result) {
          return { ...response, result: sortedFiles };
        }
        return sortedFiles;
      }
      
      return response;
    } catch (error) {
      console.error('Error getting user files:', error);
      throw error;
    }
  },

  /**
   * Download specific file
   */
  async downloadFile(fileId, fileName = null, userId = null) {
    try {
      let url = `${CUSTOM_ENDPOINTS.uploudFile.downloadFile}`;
      const params = new URLSearchParams();
      
      if (fileId) params.append('file_id', fileId);
      if (userId) params.append('user_id', userId);
      
      url += `?${params.toString()}`;

      // Використовуємо нативний fetch для блоба
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      // Отримуємо блоб з відповіді
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || `file_${fileId}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return { success: true, message: 'File downloaded successfully' };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  /**
   * Delete an uploaded file
   */
  async deleteFile(fileId, userId = null) {
    try {
      return await authRequest(CUSTOM_ENDPOINTS.uploudFile.deleteFile, {
        method: "PATCH",
        body: {
          file_id: fileId,
          user_id: userId
        }
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },
};