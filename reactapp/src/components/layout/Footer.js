import React from 'react';
import { Box, Typography, Link, useTheme } from '@mui/material';

export default function Footer() {
    const theme = useTheme();

    return (
        <Box
            component="footer"
            sx={{
                py: 3,
                px: 2,
                mt: 'auto',
                backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                        ? theme.palette.grey[100]
                        : theme.palette.grey[800],
                borderTop: '1px solid',
                borderColor: 'divider'
            }}
        >
            <Typography variant="body2" color="text.secondary" align="center">
                {'Copyright © '}
                <Link color="inherit" href="https://maypayhr.com/">
                    MayPayHR
                </Link>{' '}
                {new Date().getFullYear()}
                {'. All rights reserved.'}
            </Typography>
            <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mt: 0.5 }}>
                Version 1.0.0
            </Typography>
        </Box>
    );
}