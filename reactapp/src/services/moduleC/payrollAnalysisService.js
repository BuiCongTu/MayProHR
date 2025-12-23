import { axiosInstance } from '../api';

const API_BASE = '/payroll';

//Full analysis role: Accounting, Factory Director
export const analyzePayroll = async (request) =>
{
  try
  {
    const response = await axiosInstance.post(`${API_BASE}/analyze`, request);
    return response.data;
  } catch (error)
  {
    console.error('Error analyzing payroll:', error);
    throw error;
  }
};

//Quick analysis)
export const quickAnalyzePayroll = async (year, month) =>
{
  try
  {
    const response = await axiosInstance.get(`${API_BASE}/analyze/quick`, {
      params: { year, month }
    });
    return response.data;
  } catch (error)
  {
    console.error('Error in quick analysis:', error);
    throw error;
  }
};

//Accounting và Factory Director
export const hasAnalysisPermission = (user) =>
{
  if (!user || !user.roleName)
  {
    return false;
  }

  const roleName = user.roleName;
  const allowedRoles = ['Accounting', 'Factory Director', 'FDirector'];

  return allowedRoles.includes(roleName);
};

export default {
  analyzePayroll,
  quickAnalyzePayroll,
  hasAnalysisPermission
};
