import React, { useEffect, useState } from 'react';
import { Container, Paper, Box, Typography, Table, TableHead,
    TableRow, TableCell, TableBody, TableContainer, TablePagination,
    Chip,Button, TextField, MenuItem, Dialog,
    DialogTitle, DialogContent, DialogActions, Alert, CircularProgress
} from '@mui/material';
import {
    getPositionChangeProposals,
    approveProposal,
    rejectProposal
} from '../../../services/moduleB/proposalService';

const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    approved: 'Approved',
    rejected: 'Rejected'
};

function ProposalList({
                          title = 'Proposal List:',
                          mode = 'view', // 'view' | 'approve'
                          approverId = null,
                          defaultStatus = 'pending',
                          filterByProposerId = null
                      }) {
    const [proposals, setProposals] = useState([]);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);

    const [statusFilter, setStatusFilter] = useState(defaultStatus);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedProposal, setSelectedProposal] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const params = {
                page,
                size,
                status: statusFilter || undefined,
                proposerId: filterByProposerId || undefined
            };

            const data = await getPositionChangeProposals(params);
            // Page<T> của Spring Data: content, totalElements, number, size...
            const content = data?.content || [];
            setProposals(content);
            setTotal(data?.totalElements || 0);
        } catch (err) {
            console.error(err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
                err?.message ||
                'Proposal list load failed. Please try again later.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, size, statusFilter, filterByProposerId]);

    const handleChangePage = (_event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setSize(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleApprove = async (proposalId) => {
        if (!approverId) {
            setError('null approverId. Please check your configuration.');
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await approveProposal(proposalId, approverId);
            setSuccess('Proposal approved successfully. Please refresh to see the updated list.');
            fetchData();
        } catch (err) {
            console.error(err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
                err?.message ||
                'Proposal approval failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const openRejectDialog = (proposal) => {
        setSelectedProposal(proposal);
        setRejectReason('');
        setRejectDialogOpen(true);
    };

    const closeRejectDialog = () => {
        setRejectDialogOpen(false);
        setSelectedProposal(null);
        setRejectReason('');
    };

    const handleRejectConfirm = async () => {
        if (!approverId || !selectedProposal) {
            setError('Invalid operation. Please try again.');
            return;
        }
        if (!rejectReason.trim()) {
            setError('Please provide a reason for rejection.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await rejectProposal(selectedProposal.id, {
                approverId,
                reason: rejectReason.trim()
            });
            setSuccess('Proposal rejected successfully.');
            closeRejectDialog();
            fetchData();
        } catch (err) {
            console.error(err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
                err?.message ||
                'Proposal rejection failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const canAction = (p) => {
        if (mode !== 'approve') return false;
        // Chỉ cho phép approve/reject khi status là pending hoặc confirmed (trùng logic BE)
        return p.status === 'pending' || p.status === 'confirmed';
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2
                    }}
                >
                    <Typography variant="h5" fontWeight="bold" color="primary">
                        {title}
                    </Typography>

                    <TextField
                        select
                        size="small"
                        label="Trạng thái"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(0);
                        }}
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                    </TextField>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Factory Manager Name</TableCell>
                                <TableCell>For Employee</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Approved by</TableCell>
                                <TableCell>Create AT</TableCell>
                                {mode === 'approve' && (
                                    <TableCell align="right">Action</TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <CircularProgress size={28} />
                                    </TableCell>
                                </TableRow>
                            ) : proposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        No proposals found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                proposals.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.id}</TableCell>
                                        <TableCell>
                                            {p.proposerName} (ID: {p.proposerId})
                                        </TableCell>
                                        <TableCell>
                                            {p.targetUserName} (ID:{' '}
                                            {p.targetUserId})
                                        </TableCell>
                                        <TableCell
                                            sx={{ maxWidth: 220 }}
                                            title={p.reason}
                                        >
                                            {p.reason?.length > 40
                                                ? p.reason.slice(0, 40) + '...'
                                                : p.reason}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    STATUS_LABELS[p.status] ||
                                                    p.status
                                                }
                                                color={
                                                    p.status === 'approved'
                                                        ? 'success'
                                                        : p.status ===
                                                        'rejected'
                                                            ? 'error'
                                                            : p.status ===
                                                            'confirmed'
                                                                ? 'primary'
                                                                : 'warning'
                                                }
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {p.approvedByName
                                                ? `${p.approvedByName} (ID: ${p.approvedById})`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {p.createdAt
                                                ? new Date(
                                                    p.createdAt
                                                ).toLocaleString()
                                                : ''}
                                        </TableCell>
                                        {mode === 'approve' && (
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    sx={{ mr: 1 }}
                                                    disabled={!canAction(p)}
                                                    onClick={() =>
                                                        handleApprove(p.id)
                                                    }
                                                >
                                                    Duyệt
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    disabled={!canAction(p)}
                                                    onClick={() =>
                                                        openRejectDialog(p)
                                                    }
                                                >
                                                    Từ chối
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={size}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 20]}
                />
            </Paper>

            {/* Dialog nhập lý do từ chối */}
            <Dialog open={rejectDialogOpen} onClose={closeRejectDialog}>
                <DialogTitle>Proposal Reject</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Reason"
                        multiline
                        minRows={3}
                        fullWidth
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRejectDialog}>Hủy</Button>
                    <Button
                        onClick={handleRejectConfirm}
                        variant="contained"
                        color="error"
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default ProposalList;