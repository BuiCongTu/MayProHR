import React, { useState } from 'react';
import { Container, Paper, Tabs, Tab, Box, Typography } from '@mui/material';
import { getCurrentUser } from '../../../services/authService';
import PositionProposalForm from './PositionProposalForm';
import ProposalConfirm from './ProposalConfirm';
import ProposalApprove from './ProposalApprove';
import ErrorPage from '../../ErrorPage';

function PositionChangeManagement() {
    const user = getCurrentUser();
    const [tab, setTab] = useState(0);

    if (!user) {
        return (
            <ErrorPage
                code={401}
                title="Unauthorized"
                message="Pls login to continue. If you don't have an account, please register at the login page first. Thank you!."
            />
        );
    }

    const isFactoryManager =
        user.roleName === 'Factory Manager' || user.roleName === 'FManager';
    const isFactoryDirector =
        user.roleName === 'Factory Director' || user.roleName === 'FDirector';

    const handleChangeTab = (_e, newValue) => {
        setTab(newValue);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="primary"
                    sx={{ mb: 2 }}
                >
                    Proposal Management
                </Typography>

                <Tabs
                    value={tab}
                    onChange={handleChangeTab}
                    variant="scrollable"
                    scrollButtons="auto"
                >

                    {isFactoryManager && (
                        <Tab label="My Proposal" />
                    )}
                    {isFactoryDirector && (
                        <Tab label="Approve Proposal (Factory Director)" />
                    )}
                </Tabs>

                <Box sx={{ mt: 3 }}>
                    {/* Chỉ hiển thị My Proposal */}
                    {isFactoryManager && <ProposalConfirm />}

                    {/* Factory Director vẫn thấy approve */}
                    {isFactoryDirector && !isFactoryManager && (
                        <ProposalApprove />
                    )}
                </Box>

            </Paper>
        </Container>
    );
}

export default PositionChangeManagement;