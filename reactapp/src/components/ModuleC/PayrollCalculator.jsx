import React, {useState} from "react";
import {Alert,Box,Button,Card,CardContent,
    CircularProgress,Divider,
    Grid,Paper,TextField,Typography
} from '@mui/material';
import { calculateEmployeeSalary } from '../services/payrollService';
import { formatNumber } from '../../../utils/formatters';

export default function PayrollCalculator () {
    const [formData, setFormData] = useState({
        userId: '',
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        allowance: 0
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'userId' || name === 'allowance' ? Number(value) : value
        }));
    };

    const handleCalculate = async () => {
        if (!formData.userId || !formData.month) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Convert month to full date
            const fullDate = `${formData.month}-01`;

            const salary = await calculateEmployeeSalary(
                formData.userId,
                fullDate,
                formData.allowance
            );

            setResult(salary);
        } catch (err) {
            setError('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" mb={2}>
                    Pay formula calculator
                </Typography>

                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Id"
                            name="userId"
                            type="number"
                            value={formData.userId}
                            onChange={handleInputChange}
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Pay Month (YYYY-MM)"
                            name="month"
                            type="month"
                            value={formData.month}
                            onChange={handleInputChange}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Allowance (VND)"
                            name="allowance"
                            type="number"
                            value={formData.allowance}
                            onChange={handleInputChange}
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleCalculate}
                            disabled={loading}
                            sx={{ height: 40 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'calculate salary'}
                        </Button>
                    </Grid>
                </Grid>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {result && (
                    <Box sx={{ mt: 3, bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                            Payroll for {result.fullName}
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Base Salary
                                    </Typography>
                                    <Typography variant="h6" color="primary">
                                        {formatNumber(result.baseSalary)} ₫
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f3e5f5' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Product Bonus
                                    </Typography>
                                    <Typography variant="h6" color="secondary">
                                        {formatNumber(result.productBonus || 0)} ₫
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#fff3e0' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Overtime Pay
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: '#ff9800' }}>
                                        {formatNumber(result.overtimePay || 0)} ₫
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#c8e6c9' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Deductions
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: '#4caf50' }}>
                                        {formatNumber(result.allowance || 0)} ₫
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={12}>
                                <Divider />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffebee' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Total Deductions
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: '#f44336' }}>
                                        -{formatNumber(result.totalDeduction || 0)} ₫
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Total Pay
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: '#1b5e20', fontWeight: 'bold' }}>
                                        {formatNumber(result.totalPay)} ₫
                                    </Typography>
                                </Paper>
                            </Grid>

                            {result.calculationNote && (
                                <Grid item xs={12}>
                                    <Alert severity="info">
                                        <strong>Note:</strong> {result.calculationNote}
                                    </Alert>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};
