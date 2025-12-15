import api from '../api';

//lay ds proposal
export const getPositionChangeProposals = async (params = {}) => {
    const res = await api.get('/proposal/position-change', { params });
    return res.data;
};


// Tạo proposal luân chuyển vị trí
export const createPositionChangeProposal = async (payload) => {
    const res = await api.post('/proposal/position-change', payload);
    return res.data;
};

// Duyệt proposal
export const approveProposal = async (proposalId, approverId) => {
    const res = await api.put(`/proposal/${proposalId}/approve`, null, {
        params: { approverId }
    });
    return res.data;
};

// Từ chối proposal
export const rejectProposal = async (proposalId, body) => {
    const res = await api.put(`/proposal/${proposalId}/reject`, body);
    return res.data;
};
