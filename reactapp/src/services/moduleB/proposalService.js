import axios from 'axios';
import api from '../api';


// =================== POSITION CHANGE ===================

// Lấy danh sách proposal đổi vị trí
export const getPositionChangeProposals = async (params = {}) =>
{
    const res = await api.get('/proposal/position-change', { params });
    return res.data;
};

// Tạo proposal đổi vị trí
export const createPositionChangeProposal = async (payload) =>
{
    const res = await api.post('/proposal/position-change', payload);
    return res.data;
};

// =================== SALARY INCREASE ===================

// Lấy danh sách proposal tăng lương
export const getSalaryIncreaseProposals = async (params = {}) =>
{
    const res = await api.get('/proposal/salary-increase', { params });
    return res.data;
};

// Tạo proposal tăng lương
export const createSalaryIncreaseProposal = async (payload) =>
{
    const res = await api.post('/proposal/salary-increase', payload);
    return res.data;
};

// =================== SKILL LEVEL CHANGE ===================

// Lấy danh sách proposal nâng skill
export const getSkillLevelProposals = async (params = {}) =>
{
    const res = await api.get('/proposal/skill-level', { params });
    return res.data;
};

// Tạo proposal nâng skill
export const createSkillLevelProposal = async (payload) =>
{
    const res = await api.post('/proposal/skill-level', payload);
    return res.data;
};

// =================== APPROVE / REJECT ===================

export const getProposalsForApproval = async (type, approverId, status) =>
{
    const params = { type, approverId, status };
    const res = await axios.get('/proposal/approve', { params });
    return res.data;
};

// Từ chối proposal (áp dụng cho cả 3 loại)
export const rejectProposal = async (proposalId, body) =>
{
    const res = await api.put(`/proposal/${proposalId}/reject`, body);
    return res.data;
};

const API_URL = '/api/proposal';

export const approveProposalAPI = async (proposalId, approverId) =>
{
    const res = await axios.put(`${API_URL}/${proposalId}/approve?approverId=${approverId}`);
    return res.data;
};
