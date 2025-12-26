// FactoryDirectorProposalList.js
import React, { useState,useMemo, useEffect } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Typography, Box,
    MenuItem, Select, CircularProgress, Alert
} from '@mui/material';
import axios from 'axios';
import { BASE_API } from '../../../services/api';
import { getPositionChangeProposals, approveProposalAPI, rejectProposal } from '../../../services/moduleB/proposalService';
import { getAllRoles } from '../../../services/roleService';
import { getAllDepartments } from '../../../services/departmentService';
import { getUserById } from '../../../services/userService';

function FactoryDirectorProposalList({ approverId }) {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [userDetailsById, setUserDetailsById] = useState({});

    const [linesByDepartmentId, setLinesByDepartmentId] = useState({}); // deptId -> Line[]

    const roleNameById = useMemo(() => {
        const map = new Map();
        (roles || []).forEach(r => map.set(r.id, r.name));
        return map;
    }, [roles]);

    const deptNameById = useMemo(() => {
        const map = new Map();
        (departments || []).forEach(d => map.set(d.id, d.name));
        return map;
    }, [departments]);

    const safeParseDetails = (details) => {
        if (!details) return {};
        if (typeof details === 'object') return details;
        try {
            return JSON.parse(details);
        } catch (_e) {
            return {};
        }
    };

    const getParentId = (node) => node?.parentId ?? node?.parent?.id ?? null;

    const buildLineChain = (leafId, lineMap) => {
        if (!leafId || !lineMap?.has(leafId)) return [];
        const chain = [];
        let cur = lineMap.get(leafId);
        const guard = new Set(); // tránh loop nếu data lỗi
        while (cur && !guard.has(cur.id)) {
            guard.add(cur.id);
            chain.unshift(cur);
            const pid = getParentId(cur);
            cur = pid ? lineMap.get(pid) : null;
        }
        return chain;
    };

    const getLineDisplaysFromChain = (chain) => {
        if (!Array.isArray(chain) || chain.length === 0) {
            return { lineName: '-', subLineName: '-', workUnitName: '-' };
        }
        const root = chain[0];
        const leaf = chain[chain.length - 1];
        const sub = chain.length >= 3 ? chain[chain.length - 2] : null;

        return {
            lineName: root?.name || '-',
            subLineName: sub?.name || '-',
            workUnitName: leaf?.name || '-'
        };
    };

    const fetchLinesByDepartment = async (departmentId) => {
        if (!departmentId) return [];
        if (linesByDepartmentId[departmentId]) return linesByDepartmentId[departmentId];

        const token = localStorage.getItem('token');
        const url = `${BASE_API}/lines/department/${departmentId}`;

        const response = await axios.get(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });

        const data = response?.data?.data ?? response?.data ?? [];
        const list = Array.isArray(data) ? data : [];

        setLinesByDepartmentId(prev => ({ ...prev, [departmentId]: list }));
        return list;
    };

    // Load lookup data: roles + departments
    useEffect(() => {
        const loadLookups = async () => {
            try {
                const [rolesData, deptData] = await Promise.all([
                    getAllRoles(),
                    getAllDepartments()
                ]);
                setRoles(Array.isArray(rolesData) ? rolesData : []);
                setDepartments(Array.isArray(deptData) ? deptData : []);
            } catch (e) {
                console.error('Failed to load lookups:', e);
            }
        };
        loadLookups();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getPositionChangeProposals({ status: statusFilter });
            const data = Array.isArray(response) ? response : response.content || [];
            const sortedProposals = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setProposals(sortedProposals);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch proposals.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    // Enrich: load current user details for each targetUserId
    useEffect(() => {
        const loadUsers = async () => {
            const ids = Array.from(new Set((proposals || []).map(p => p.targetUserId).filter(Boolean)));
            const missing = ids.filter(id => !userDetailsById[id]);
            if (missing.length === 0) return;

            try {
                const results = await Promise.all(
                    missing.map(async (id) => {
                        try {
                            const u = await getUserById(id);
                            return [id, u];
                        } catch (_e) {
                            return [id, null];
                        }
                    })
                );

                setUserDetailsById(prev => {
                    const next = { ...prev };
                    results.forEach(([id, u]) => { next[id] = u; });
                    return next;
                });
            } catch (e) {
                console.error('Failed to load user details:', e);
            }
        };

        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proposals]);

    // Enrich: preload lines per proposed department (để render Proposed line/sub/workunit)
    useEffect(() => {
        const loadLines = async () => {
            const deptIds = Array.from(
                new Set(
                    (proposals || [])
                        .map(p => safeParseDetails(p.details))
                        .map(d => d?.new_department_id)
                        .filter(Boolean)
                )
            );

            const missing = deptIds.filter(id => !linesByDepartmentId[id]);
            if (missing.length === 0) return;

            try {
                await Promise.all(missing.map(fetchLinesByDepartment));
            } catch (e) {
                console.error('Failed to load lines by department:', e);
            }
        };

        loadLines();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proposals]);

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
                Approve Position Change Proposals
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
                            <TableCell>Proposer</TableCell>
                            <TableCell>Target Employee</TableCell>
                            <TableCell>Current Position</TableCell>
                            <TableCell>Proposed Position</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Rejected Reason</TableCell>
                            <TableCell>Approved By</TableCell>
                            <TableCell>Created At</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={11} align="center">
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : proposals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} align="center">
                                    No proposals found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            proposals.map((p) => {
                                const details = safeParseDetails(p.details);
                                const target = userDetailsById[p.targetUserId];

                                const proposedRoleName = details.new_role_id ? (roleNameById.get(details.new_role_id) || '-') : '-';
                                const proposedDeptName = details.new_department_id ? (deptNameById.get(details.new_department_id) || '-') : '-';
                                const proposedSalary = details.new_salary ?? '-';
                                const proposedSalaryType = details.new_salary_type ?? '-';

                                const proposedDeptId = details.new_department_id || null;
                                const proposedLines = proposedDeptId ? (linesByDepartmentId[proposedDeptId] || []) : [];
                                const proposedLineMap = new Map((proposedLines || []).map(l => [l.id, l]));

                                const proposedLeafId =
                                    details.new_work_unit_id ??
                                    details.new_sub_line_id ??
                                    details.new_line_id ??
                                    null;

                                const proposedChain = buildLineChain(proposedLeafId, proposedLineMap);
                                const { lineName: proposedLineName, subLineName: proposedSubLineName, workUnitName: proposedWorkUnitName } =
                                    getLineDisplaysFromChain(proposedChain);

                                const currentRoleName = target?.roleName || target?.role?.name || '-';
                                const currentDeptName = target?.departmentName || target?.department?.name || '-';
                                const currentLineName = target?.lineName || '-';
                                const currentSubLineName = target?.subLineName || '-';
                                const currentWorkUnitName = target?.workUnitName || '-';
                                const currentSalary = target?.baseSalary ?? '-';
                                const currentSalaryType = target?.salaryType ?? '-';

                                return (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.id}</TableCell>
                                        <TableCell>{p.proposerName} (ID: {p.proposerId})</TableCell>
                                        <TableCell>{p.targetUserName} (ID: {p.targetUserId})</TableCell>

                                        <TableCell>
                                            <Typography variant="body2">Role: {currentRoleName}</Typography>
                                            <Typography variant="body2">Department: {currentDeptName}</Typography>
                                            <Typography variant="body2">Line: {currentLineName}</Typography>
                                            <Typography variant="body2">Sub-line: {currentSubLineName}</Typography>
                                            <Typography variant="body2">Work Unit: {currentWorkUnitName}</Typography>
                                            <Typography variant="body2">Salary: {currentSalary} ({currentSalaryType})</Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">Role: {proposedRoleName}</Typography>
                                            <Typography variant="body2">Department: {proposedDeptName}</Typography>
                                            <Typography variant="body2">Line: {proposedLineName}</Typography>
                                            <Typography variant="body2">Sub-line: {proposedSubLineName}</Typography>
                                            <Typography variant="body2">Work Unit: {proposedWorkUnitName}</Typography>
                                            <Typography variant="body2">Salary: {proposedSalary} ({proposedSalaryType})</Typography>
                                        </TableCell>

                                        <TableCell>{p.reason || '-'}</TableCell>
                                        <TableCell>{p.status}</TableCell>
                                        <TableCell>{p.rejectedReason || '-'}</TableCell>
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
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

export default FactoryDirectorProposalList;
