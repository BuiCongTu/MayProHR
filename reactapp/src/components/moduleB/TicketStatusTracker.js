import React from 'react';
import {
    Box, Stepper, Step, StepLabel, StepConnector, Typography,
    stepConnectorClasses, styled
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import VerifiedIcon from '@mui/icons-material/Verified';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
    [`&.${stepConnectorClasses.active}`]: {
        [`& .${stepConnectorClasses.line}`]: { backgroundImage: 'linear-gradient( 95deg,rgb(33, 150, 243) 0%,rgb(33, 203, 243) 50%,rgb(136, 225, 242) 100%)' },
    },
    [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: { backgroundImage: 'linear-gradient( 95deg,rgb(76, 175, 80) 0%,rgb(139, 195, 74) 50%,rgb(205, 220, 57) 100%)' },
    },
    [`& .${stepConnectorClasses.line}`]: {
        height: 3, border: 0, backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0', borderRadius: 1,
    },
}));

const ColorlibStepIconRoot = styled('div')(({ theme, ownerState }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
    zIndex: 1, color: '#fff', width: 50, height: 50, display: 'flex', borderRadius: '50%',
    justifyContent: 'center', alignItems: 'center',
    ...(ownerState.active && { backgroundImage: 'linear-gradient( 136deg, rgb(33, 150, 243) 0%, rgb(33, 203, 243) 50%, rgb(136, 225, 242) 100%)', boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)' }),
    ...(ownerState.completed && { backgroundImage: 'linear-gradient( 136deg, rgb(76, 175, 80) 0%, rgb(139, 195, 74) 50%, rgb(205, 220, 57) 100%)' }),
    ...(ownerState.error && { backgroundImage: 'linear-gradient( 136deg, #d32f2f 0%, #f44336 50%, #ffcdd2 100%)' }),
}));

function TicketStepIcon(props) {
    const { active, completed, className, icon, error } = props;
    const icons = {
        1: <SendIcon />,
        2: <ScheduleIcon />,
        3: <VerifiedIcon />,
    };
    let content = icons[String(icon)];
    if (error) content = <CancelIcon />;
    else if (completed) content = <VerifiedIcon />;
    return <ColorlibStepIconRoot ownerState={{ completed, active, error }} className={className}>{content}</ColorlibStepIconRoot>;
}

export default function TicketStatusTracker({ status, orientation = 'horizontal' }) {
    let activeStep = 0;
    let isError = false;
    let errorLabel = "Rejected";

    const normalizedStatus = status ? status.toLowerCase() : 'submitted';

    switch (normalizedStatus) {
        case 'submitted': activeStep = 1; break; // Submitted -> Scheduled
        case 'approved': activeStep = 3; break;
        case 'rejected': isError = true; activeStep = 2; break; // Fail at Step 3 (Validation)
        default: activeStep = 1;
    }

    const steps = [
        { label: 'Submitted', sub: 'Created by Manager' },
        { label: 'Scheduled', sub: 'Waiting for Auto-Run' },
        { label: 'Validated', sub: 'Approved for Payroll' },
    ];

    return (
        <Box sx={{ width: '100%', py: 2 }}>
            <Stepper alternativeLabel={orientation === 'horizontal'} orientation={orientation} activeStep={activeStep} connector={orientation === 'horizontal' ? <ColorlibConnector /> : undefined}>
                {steps.map((step, index) => {
                    const stepFailed = isError && activeStep === index;
                    const label = stepFailed ? errorLabel : step.label;
                    return (
                        <Step key={step.label}>
                            <StepLabel error={stepFailed} StepIconComponent={(props) => <TicketStepIcon {...props} error={stepFailed} />}>
                                <Typography variant="subtitle2" fontWeight="bold" color={stepFailed ? "error" : "inherit"}>{label}</Typography>
                                <Typography variant="caption" color="textSecondary" display="block">{step.sub}</Typography>
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
}