import React, { useEffect, useState } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Typography, Box, MenuItem, Select, CircularProgress, Alert
} from '@mui/material';
import {
    getSalaryIncreaseProposals,
    getPositionChangeProposals,
    getSkillLevelProposals,
    approveProposalAPI,
    rejectProposal
} from '../../../services/moduleB/proposalService';

function FactoryDirectorProposalList({ approverId }) {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Lấy dữ liệu từng loại proposal, gửi đúng params
            const [salaryRes, positionRes, skillRes] = await Promise.all([
                getSalaryIncreaseProposals({ status: statusFilter }),
                getPositionChangeProposals({ status: statusFilter }),
                getSkillLevelProposals({ status: statusFilter }),
            ]);

            // Gộp dữ liệu lại
            const allProposals = [
                ...(salaryRes || []),
                ...(positionRes || []),
                ...(skillRes || []),
            ];

            // Sắp xếp theo createdAt giảm dần
            allProposals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setProposals(allProposals);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch proposals.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const handleApprove = async (id) => {
        try {
            await approveProposalAPI(id, approverId);
            fetchData();
        } catch (err) {
            console.error(err);
            setError('Approval failed.');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        try {
            await rejectProposal(id, { approverId, reason });
            fetchData();
        } catch (err) {
            console.error(err);
            setError('Rejection failed.');
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
                All Proposals for Approval
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box display="flex" gap={2} mb={2} alignItems="center">
                <Typography>Status:</Typography>
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Proposer</TableCell>
                            <TableCell>Target Employee</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Approved By</TableCell>
                            <TableCell>Created At</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : proposals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    No proposals found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            proposals.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.id}</TableCell>
                                    <TableCell>{p.type || '-'}</TableCell>
                                    <TableCell>{p.proposerName} (ID: {p.proposerId})</TableCell>
                                    <TableCell>{p.targetUserName} (ID: {p.targetUserId})</TableCell>
                                    <TableCell>{p.reason || '-'}</TableCell>
                                    <TableCell>{p.status}</TableCell>
                                    <TableCell>{p.approvedByName || '-'}</TableCell>
                                    <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</TableCell>
                                    <TableCell>
                                        {p.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    sx={{ mr: 1 }}
                                                    onClick={() => handleApprove(p.id)}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="error"
                                                    onClick={() => handleReject(p.id)}
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

export default FactoryDirectorProposalList;
