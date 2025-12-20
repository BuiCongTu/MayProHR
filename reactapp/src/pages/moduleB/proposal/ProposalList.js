import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Paper, Typography, MenuItem, Select, Box } from '@mui/material';
import {
    getSalaryIncreaseProposals,
    getPositionChangeProposals,
    getSkillLevelProposals
} from '../../../services/moduleB/proposalService';

function ProposalList({ title, proposalType, filterByProposerId, defaultStatus }) {
    const [data, setData] = useState([]);
    const [statusFilter, setStatusFilter] = useState(defaultStatus || "");

    useEffect(() => {
        const fetchData = async () => {
            try {
                let response = [];
                switch (proposalType) {
                    case "salary-increase":
                        response = await getSalaryIncreaseProposals({ proposerId: filterByProposerId, status: statusFilter });
                        break;
                    case "position-change":
                        response = await getPositionChangeProposals({ proposerId: filterByProposerId, status: statusFilter });
                        break;
                    case "skill-level":
                        response = await getSkillLevelProposals({ proposerId: filterByProposerId, status: statusFilter });
                        break;
                    default:
                        response = [];
                }

                // đảm bảo response luôn là mảng
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
            <Typography variant="h6" mb={2}>{title}</Typography>

            <Box mb={2}>
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
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
                        <TableCell>Approved by</TableCell>
                        <TableCell>Created At</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} align="center">No proposals found.</TableCell>
                        </TableRow>
                    ) : (
                        data.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>{p.id}</TableCell>
                                <TableCell>{p.proposerName} (ID: {p.proposerId})</TableCell>
                                <TableCell>{p.targetUserName} (ID: {p.targetUserId})</TableCell>
                                <TableCell>{p.reason || '-'}</TableCell>
                                <TableCell>{p.status}</TableCell>
                                <TableCell>{p.approvedByName || '-'}</TableCell>
                                <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Paper>
    );
}

export default ProposalList;
