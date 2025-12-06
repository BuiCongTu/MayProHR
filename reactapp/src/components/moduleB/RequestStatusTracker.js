import React from 'react';
import {
    Box, Stepper, Step, StepLabel, StepConnector, Typography,
    stepConnectorClasses, styled
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import CancelIcon from '@mui/icons-material/Cancel';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';

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

function ColorlibStepIcon(props) {
    const { active, completed, className, icon, error } = props;
    const icons = {
        1: <CreateNewFolderIcon />,
        2: <WorkHistoryIcon />,
        3: <HourglassBottomIcon />,
        4: <AutoModeIcon />,
    };
    let content = icons[String(icon)];
    if (error) content = <CancelIcon />;
    else if (completed) content = <CheckCircleIcon />;
    return <ColorlibStepIconRoot ownerState={{ completed, active, error }} className={className}>{content}</ColorlibStepIconRoot>;
}

export default function RequestStatusTracker({ status, orientation = 'horizontal' }) {
    let activeStep = 0;
    let isError = false;
    let errorLabel = "";

    const normalizedStatus = status ? status.toLowerCase() : 'pending';

    switch (normalizedStatus) {
        case 'pending': activeStep = 1; break;
        case 'open': activeStep = 2; break;
        case 'rejected': activeStep = 1; isError = true; errorLabel = "Rejected by Director"; break;
        case 'expired': activeStep = 2; isError = true; errorLabel = "Expired / Timed Out"; break;
        case 'processed': activeStep = 4; break;
        default: activeStep = 1;
    }

    const getStep1Sub = () => {
        if (normalizedStatus === 'pending') return 'Waiting for FD Approval';
        if (normalizedStatus === 'rejected') return 'Contact Director for more info';
        return 'Approved by Director';
    };

    const steps = [
        { label: 'Request Creation', sub: 'Created By Factory Manager' },
        { label: isError && activeStep === 1 ? errorLabel : 'Submission & Review', sub: getStep1Sub() },
        { label: isError && activeStep === 2 ? errorLabel : 'Execution & Tickets', sub: 'Line Managers Assign Employees' },
        { label: 'Auto-Processing', sub: '4 Hours Before Start' },
    ];

    return (
        <Box sx={{ width: '100%', py: 2 }}>
            <Stepper alternativeLabel={orientation === 'horizontal'} orientation={orientation} activeStep={activeStep} connector={orientation === 'horizontal' ? <ColorlibConnector /> : undefined}>
                {steps.map((step, index) => {
                    const stepFailed = isError && activeStep === index;
                    return (
                        <Step key={step.label}>
                            <StepLabel error={stepFailed} StepIconComponent={(props) => <ColorlibStepIcon {...props} error={stepFailed} />}>
                                <Typography variant="subtitle2" fontWeight="bold" color={stepFailed ? "error" : "inherit"}>{step.label}</Typography>
                                <Typography variant="caption" color="textSecondary" display="block">{step.sub}</Typography>
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
}