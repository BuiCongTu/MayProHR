import React from 'react';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    StepConnector,
    Typography,
    stepConnectorClasses,
    styled
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import CancelIcon from '@mui/icons-material/Cancel';

// --- CUSTOM STYLES ---
const QontoConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
        top: 10,
        left: 'calc(-50% + 16px)',
        right: 'calc(50% + 16px)',
    },
    [`&.${stepConnectorClasses.active}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            borderColor: '#784af4',
        },
    },
    [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            borderColor: '#784af4',
        },
    },
    [`& .${stepConnectorClasses.line}`]: {
        borderColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
        borderTopWidth: 3,
        borderRadius: 1,
    },
}));

export default function WorkflowStepper({ status }) {
    const s = (status || '').toLowerCase();

    let activeStep = 0;
    let isRejected = false;

    // --- DETERMINE ACTIVE STEP ---
    if (s === 'draft') activeStep = 0;
    else if (s === 'pending') activeStep = 1;
    else if (s === 'rejected') { activeStep = 1; isRejected = true; }
    else if (s === 'open') activeStep = 2;
    else if (s === 'processed') activeStep = 4; // Completed

    // --- DYNAMIC LABELS ---
    // Step 1: Draft
    const step1 = {
        label: 'Draft',
        desc: 'Factory Manager creates Request'
    };

    // Step 2: Approval (Dynamic based on outcome)
    let step2 = {
        label: 'Pending Approval',
        desc: 'Pending Factory Director Approval'
    };

    if (isRejected) {
        step2 = { label: 'Rejected', desc: 'Rejected by Factory Director' };
    } else if (activeStep > 1) {
        // If we are past step 1 (Open or Processed), it means it was Approved
        step2 = { label: 'Approved', desc: 'Approved by Factory Director' };
    }

    // Step 3: Assignment
    const step3 = {
        label: 'Open',
        desc: 'Line Manager assigns Employees'
    };

    // Step 4: Processed
    const step4 = {
        label: 'Processed',
        desc: 'Payroll ready'
    };

    const steps = [step1, step2, step3, step4];

    return (
        <Box sx={{ width: '100%', mb: 4 }}>
            <Stepper alternativeLabel activeStep={activeStep} connector={<QontoConnector />}>
                {steps.map((step, index) => {
                    const labelProps = {};
                    const isStepRejected = isRejected && index === activeStep;

                    // Error State Logic (Turn text red)
                    if (isStepRejected) {
                        labelProps.error = true;
                    }

                    return (
                        <Step key={step.label}>
                            <StepLabel
                                {...labelProps}
                                StepIconComponent={(props) => {
                                    const { active, completed, error } = props;

                                    // 1. Rejected State (Red X)
                                    if (error || isStepRejected) {
                                        return <CancelIcon color="error" sx={{ fontSize: 30 }} />;
                                    }
                                    // 2. Completed State (Green Check)
                                    if (completed) {
                                        return <CheckCircleIcon color="success" sx={{ fontSize: 30 }} />;
                                    }
                                    // 3. Active State (Blue Pulse)
                                    if (active) {
                                        return <PlayCircleFilledIcon color="primary" sx={{ fontSize: 34, filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }} />;
                                    }

                                    // 4. Future State (Grey Dot)
                                    return <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 24 }} />;
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    fontWeight="bold"
                                    color={isStepRejected ? "error" : "inherit"}
                                >
                                    {step.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    display="block"
                                    color={isStepRejected ? "error" : "text.secondary"}
                                    sx={{ lineHeight: 1.2, mt: 0.5 }}
                                >
                                    {step.desc}
                                </Typography>
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
}