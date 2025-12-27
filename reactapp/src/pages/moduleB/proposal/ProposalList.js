import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    Typography,
    MenuItem,
    Select,
    Box
} from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import {
    getSalaryIncreaseProposals,
    getPositionChangeProposals,
    getSkillLevelProposals
} from '../../../services/moduleB/proposalService';

// CSS pending
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

function ProposalList({ title, proposalType, filterByProposerId }) {

    const [data, setData] = useState([]);


    const [statusFilter, setStatusFilter] = useState('pending');

    useEffect(() => {
        const fetchData = async () => {
            try {
                let response = [];

                const params = {
                    proposerId: filterByProposerId,
                    status: statusFilter
                };

                switch (proposalType) {
                    case 'salary-increase':
                        response = await getSalaryIncreaseProposals(params);
                        break;
                    case 'position-change':
                        response = await getPositionChangeProposals(params);
                        break;
                    case 'skill-level':
                        response = await getSkillLevelProposals(params);
                        break;
                    default:
                        response = [];
                }

                setData(Array.isArray(response) ? response : response.content || []);
            } catch (err) {
                console.error(err);
                setData([]);
            }
        };

        fetchData();
    }, [proposalType, filterByProposerId, statusFilter]);

    return (
        <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" mb={2}>
                {title}
            </Typography>

            {/* STATUS FILTER */}
            <Box mb={2}>
                <Select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    sx={{ width: 240 }}
                >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
            </Box>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Proposer</TableCell>
                        <TableCell>Target Employee</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Status</TableCell>

                        {statusFilter === 'approved' && (
                            <TableCell>Approved By</TableCell>
                        )}

                        {statusFilter === 'rejected' && (
                            <TableCell>Reject Reason</TableCell>
                        )}

                        <TableCell>Created At</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={
                                    statusFilter === 'approved' || statusFilter === 'rejected'
                                        ? 8
                                        : 7
                                }
                                align="center"
                            >
                                No proposals found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>{p.id}</TableCell>
                                <TableCell>
                                    {p.proposerName} (ID: {p.proposerId})
                                </TableCell>
                                <TableCell>
                                    {p.targetUserName} (ID: {p.targetUserId})
                                </TableCell>
                                <TableCell>{p.reason || '-'}</TableCell>

                                {/* ✅ STATUS UI */}
                                <TableCell>
                                    {p.status === 'pending' && (
                                        <span style={pendingStyle}>
                                            <span style={blinkDot} />
                                            Pending
                                        </span>
                                    )}

                                    {p.status === 'approved' && (
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <CheckCircleIcon sx={{ color: 'green', fontSize: 18 }} />
                                            <Typography color="green">Approved</Typography>
                                        </Box>
                                    )}

                                    {p.status === 'rejected' && (
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <CancelIcon sx={{ color: 'red', fontSize: 18 }} />
                                            <Typography color="red">Rejected</Typography>
                                        </Box>
                                    )}
                                </TableCell>

                                {statusFilter === 'approved' && (
                                    <TableCell>{p.approvedByName || '-'}</TableCell>
                                )}

                                {statusFilter === 'rejected' && (
                                    <TableCell>{p.rejectReason || '-'}</TableCell>
                                )}

                                <TableCell>
                                    {p.createdAt
                                        ? new Date(p.createdAt).toLocaleString()
                                        : '-'}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* animation keyframes */}
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

export default ProposalList;
