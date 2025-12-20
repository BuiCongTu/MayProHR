import React, { useState } from 'react';
import {
    Paper, Box, TextField, Button, MenuItem, Alert, CircularProgress, Typography
} from '@mui/material';
import { createSalaryIncreaseProposal } from '../../../services/moduleB/proposalService';

function SalaryProposalForm({ proposerId }) {
    const [targetUserId, setTargetUserId] = useState('');
    const [newSalary, setNewSalary] = useState('');
    const [salaryType, setSalaryType] = useState('Monthly');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async () => {
        // Validate input
        const amount = parseFloat(newSalary);
        if (!targetUserId || !reason.trim()) {
            setError('Please fill all required fields.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid salary increase amount.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await createSalaryIncreaseProposal({
                proposerId,
                targetUserId,
                newSalary: amount,
                salaryType,
                reason: reason.trim()
            });
            setSuccess('Salary proposal submitted successfully.');
            setTargetUserId('');
            setNewSalary('');
            setReason('');
        } catch (err) {
            console.error(err);
            const msg = err?.response?.data?.message || 'Submission failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
                Submit Salary Proposal
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                    label="Employee ID"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                />
                <TextField
                    label="New Salary"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                />
                <TextField
                    select
                    label="Salary Type"
                    value={salaryType}
                    onChange={(e) => setSalaryType(e.target.value)}
                >
                    <MenuItem value="Monthly">Monthly</MenuItem>
                    <MenuItem value="Daily">Daily</MenuItem>
                </TextField>
                <TextField
                    label="Reason"
                    multiline
                    minRows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Submit'}
                </Button>
            </Box>
        </Paper>
    );
}

export default SalaryProposalForm;
