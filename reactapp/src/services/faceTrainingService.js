
import axios from 'axios';

const API_URL = 'http://localhost:9999/api';

export const getDepartments = async () =>
{
    try {
        const response = await axios.get(`${API_URL}/department/`);
        return response.data.data || response.data || [];
    } catch (error) {
        console.error('Error fetching departments:', error);
        return [];
    }
};

export const getSectionsByDepartment = async (departmentId) =>
{
    try {
        const response = await axios.get(`${API_URL}/lines/department/${departmentId}`);
        return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
        console.error('Error fetching sections:', error);
        return [];
    }
};

export const getSubSectionsBySection = async (sectionId) =>
{
    try {
        const response = await axios.get(`${API_URL}/lines/children/${sectionId}`);
        return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
        console.error('Error fetching sub-sections:', error);
        return [];
    }
};

export const getWorkUnitsBySubSection = async (subSectionId) =>
{
    try {
        const response = await axios.get(`${API_URL}/lines/children/${subSectionId}`);
        return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
        console.error('Error fetching work units:', error);
        return [];
    }
};

export const getEmployeesByDepartment = async (departmentId) =>
{
    try {
        const response = await axios.get(`${API_URL}/users/department/${departmentId}`);
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
    }
};

export const getAllRoles = async () =>
{
    try {
        const response = await axios.get(`${API_URL}/form-data/roles`);
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching all roles:', error);
        return [];
    }
};

export const trainFaceWithBase64 = async (userId, imageBase64, trainedByUserId) =>
{
    try {
        const response = await axios.post(`${API_URL}/attendance/register-face`, {
            userId,
            imageBase64
        });
        
        // Handle response from backend
        if (response.data && response.data.success) {
            return {
                success: true,
                data: response.data.data,
                message: response.data.message || 'Face training successful'
            };
        } else {
            return {
                success: false,
                message: response.data?.message || 'Face training failed'
            };
        }
    } catch (error) {
        console.error('Error training face:', error);
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to train face'
        };
    }
};

export const deleteFaceTraining = async (userId) =>
{
    try {
        const response = await axios.delete(`${API_URL}/face-training/${userId}`);
        
        if (response.data && response.data.success) {
            return {
                success: true,
                data: response.data.data,
                message: response.data.message || 'Face training deleted successfully'
            };
        } else {
            return {
                success: false,
                message: response.data?.message || 'Failed to delete face training'
            };
        }
    } catch (error) {
        console.error('Error deleting face training:', error);
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to delete face training'
        };
    }
};

export const getFaceTrainingStatus = async (userId) =>
{
    try {
        const response = await axios.get(`${API_URL}/face-training/${userId}`);
        
        if (response.data && response.data.success) {
            return {
                success: true,
                data: response.data.data,
                isTrained: response.data.data?.isTrained || false
            };
        } else {
            return {
                success: false,
                isTrained: false,
                message: 'No face training found'
            };
        }
    } catch (error) {
        console.error('Error fetching face training status:', error);
        return {
            success: false,
            isTrained: false,
            message: 'Failed to fetch face training status'
        };
    }
};

export const checkDuplicateUser = async (departmentId, parentLineId, lineId, subLineId, roleId) =>
{
    try {
        const response = await axios.get(`${API_URL}/user/check-duplicate`, {
            params: {
                departmentId: departmentId || null,
                parentLineId: parentLineId || null,
                lineId: lineId || null,
                subLineId: subLineId || null,
                roleId
            }
        });
        return response.data.data || null;
    } catch (err) {
        if (err.response?.status === 404) {
            return null;
        }
        console.error('Error checking duplicate user:', err);
        return null;
    }
};

export default {
    getDepartments,
    getSectionsByDepartment,
    getSubSectionsBySection,
    getWorkUnitsBySubSection,
    getEmployeesByDepartment,
    getAllRoles,
    trainFaceWithBase64,
    deleteFaceTraining,
    getFaceTrainingStatus,
    checkDuplicateUser
};
