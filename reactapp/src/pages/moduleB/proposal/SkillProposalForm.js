// manager
import React, { useState } from 'react';
import {
    Paper, Box, TextField, Button, MenuItem, Alert, CircularProgress, Typography
} from '@mui/material';
import { createSkillLevelProposal } from '../../../services/moduleB/proposalService';

function SkillProposalForm({ proposerId }) {
    const [targetUserId, setTargetUserId] = useState('');
    const [skillName, setSkillName] = useState('');
    const [level, setLevel] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async () => {
        if (!targetUserId || !skillName || !level || !reason.trim()) {
            setError('Please fill all required fields.');
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await createSkillLevelProposal({
                proposerId,
                targetUserId,
                skillName,
                level,
                reason: reason.trim()
            });
            setSuccess('Skill proposal submitted successfully.');
            setTargetUserId('');
            setSkillName('');
            setLevel('');
            setReason('');
        } catch (err) {
            console.error(err);
            setError(err?.response?.data?.message || 'Submission failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
                Submit Skill Proposal
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
                    label="Skill Name"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                />
                <TextField
                    label="Level"
                    select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                >
                    <MenuItem value="Beginner">Beginner</MenuItem>
                    <MenuItem value="Intermediate">Intermediate</MenuItem>
                    <MenuItem value="Advanced">Advanced</MenuItem>
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

export default SkillProposalForm;
