import React, { useState, useEffect } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Typography, Box,
    MenuItem, Select, CircularProgress, Alert
} from '@mui/material';
import {
    getPositionChangeProposals,
    approveProposalAPI,
    rejectProposal
} from '../../../services/moduleB/proposalService';

/* ===== STATUS STYLES ===== */
const pendingStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#ed6c02',
    fontWeight: 600
};

const blinkDot = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#ed6c02',
    animation: 'blink 1s infinite'
};

const approvedStyle = { color: '#2e7d32', fontWeight: 600 };
const rejectedStyle = { color: '#d32f2f', fontWeight: 600 };
/* ========================= */

function FactoryDirectorProposalList({ approverId }) {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');

    /* ===== FETCH DATA ===== */
    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getPositionChangeProposals({ status: statusFilter });
            const data = Array.isArray(res) ? res : res.content || [];
            setProposals(
                data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            );
        } catch {
            setError('Failed to fetch proposals.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    /* ===== ACTIONS ===== */
    const handleApprove = async (id) => {
        try {
            await approveProposalAPI(id, approverId);
            fetchData(); // ✅ reload list
        } catch {
            setError('Approve failed.');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await rejectProposal(id, { approverId, reason });
            fetchData(); // ✅ reload list
        } catch {
            setError('Reject failed.');
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
                Approve Position Change Proposals
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box mb={2}>
                <Select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
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
                            <TableCell>Proposer</TableCell>
                            <TableCell>Target Employee</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Status</TableCell>
                            {statusFilter === 'rejected' && <TableCell>Rejected Reason</TableCell>}
                            {statusFilter === 'approved' && <TableCell>Approved By</TableCell>}
                            <TableCell>Created At</TableCell>
                            {statusFilter === 'pending' && <TableCell>Action</TableCell>}
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
                            proposals.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.id}</TableCell>
                                    <TableCell>{p.proposerName}</TableCell>
                                    <TableCell>{p.targetUserName}</TableCell>
                                    <TableCell>{p.reason || '-'}</TableCell>

                                    {/* STATUS */}
                                    <TableCell>
                                        {p.status === 'pending' && (
                                            <span style={pendingStyle}>
                                                <span style={blinkDot} />
                                                Pending
                                            </span>
                                        )}
                                        {p.status === 'approved' && (
                                            <span style={approvedStyle}>✔ Approved</span>
                                        )}
                                        {p.status === 'rejected' && (
                                            <span style={rejectedStyle}>✖ Rejected</span>
                                        )}
                                    </TableCell>

                                    {statusFilter === 'rejected' && (
                                        <TableCell>{p.rejectReason || '-'}</TableCell>
                                    )}

                                    {statusFilter === 'approved' && (
                                        <TableCell>{p.approvedByName || '-'}</TableCell>
                                    )}

                                    <TableCell>
                                        {p.createdAt
                                            ? new Date(p.createdAt).toLocaleString()
                                            : '-'}
                                    </TableCell>

                                    {statusFilter === 'pending' && (
                                        <TableCell>
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
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Blink animation */}
            <style>
                {`
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.2; }
                    100% { opacity: 1; }
                }
                `}
            </style>
        </Paper>
    );
}

export default FactoryDirectorProposalList;
