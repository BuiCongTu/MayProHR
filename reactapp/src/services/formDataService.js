import axios from 'axios';

const API_URL = 'http://localhost:9999/api';

export const getDepartments = async () =>
{
  const response = await axios.get(`${API_URL}/department/`);
  return response.data;
};

export const getLinesByDepartment = async (departmentId) =>
{
  const response = await axios.get(`${API_URL}/lines/department/${departmentId}`);
  return response.data;
};

export const getRootLines = async (departmentId) =>
{
  const response = await axios.get(`${API_URL}/lines/root/${departmentId}`);
  return response.data.data;
};

export const getChildLines = async (parentLineId) =>
{
  const response = await axios.get(`${API_URL}/lines/children/${parentLineId}`);
  return response.data.data;
};

export const getRoles = async () =>
{
  const response = await axios.get(`${API_URL}/form-data/roles`);
  return response.data.data;
};

export const getSkillLevels = async () =>
{
  const response = await axios.get(`${API_URL}/form-data/skill-levels`);
  return response.data.data;
};

export const getUsersByLineAndRole = async (lineId, roleId) =>
{
  const response = await axios.get(`${API_URL}/user/by-line/${lineId}/role/${roleId}`);
  return response.data.data || [];
};

export const checkDuplicateUser = async (departmentId, parentLineId, lineId, subLineId, roleId) =>
{
  try {
    const response = await axios.get(`${API_URL}/user/check-duplicate`, {
      params: {
        departmentId,
        parentLineId: parentLineId || null,
        lineId: lineId || null,
        subLineId: subLineId || null,
        roleId
      }
    });
    return response.data.data || null;
  } catch (err) {
    if (err.response?.status === 404) {
      return null; // No duplicate found
    }
    throw err;
  }
};

export default {
  getDepartments,
  getLinesByDepartment,
  getRootLines,
  getChildLines,
  getRoles,
  getSkillLevels,
  getUsersByLineAndRole,
  checkDuplicateUser
};
