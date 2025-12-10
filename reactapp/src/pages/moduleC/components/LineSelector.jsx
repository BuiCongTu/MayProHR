import React, { useState, useEffect } from 'react';
import {
    Box,
    Breadcrumbs,
    Link,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Stack
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { getDepartmentLines, getChildLines } from '../services/payrollService';

//Department > Line (Level 3) > SubLine (Level 4) > WordUnit (Level 5)

export const LineSelector = ({ departmentId, onSelectLine, selectedLine }) => {
    const [breadcrumbPath, setBreadcrumbPath] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [allLines, setAllLines] = useState([]);

    useEffect(() => {
        if (departmentId) {
            loadDepartmentLines();
        }
    }, [departmentId]);

    const loadDepartmentLines = async () => {
        try {
            setLoading(true);
            setError(null);

            const lines = await getDepartmentLines(departmentId);
            setAllLines(lines);

            // Xây dựng breadcrumb từ dữ liệu lines
            const breadcrumb = buildBreadcrumb(lines);
            setBreadcrumbPath(breadcrumb);
        } catch (err) {
            setError('Lỗi tải dữ liệu lines: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    //Level 3 (Operations) > Level 4 (Finishing) > Level 5 (Sewing Programming)
    const buildBreadcrumb = (lines) => {
        const breadcrumb = [];

        // Lọc theo level
        const level3 = lines.filter(l => l.level === 3); // Operations, Delivery

        level3.forEach(mainLine => {
            // Level 4: Children của Level 3
            const level4Children = lines.filter(l => l.parentId === mainLine.id && l.level === 4);

            level4Children.forEach(subLine => {
                // Level 5: Children của Level 4
                const level5Children = lines.filter(l => l.parentId === subLine.id && l.level === 5);

                level5Children.forEach(wordUnit => {
                    breadcrumb.push({
                        level3: mainLine.name,
                        level3Id: mainLine.id,
                        level4: subLine.name,
                        level4Id: subLine.id,
                        level5: wordUnit.name,
                        level5Id: wordUnit.id,
                        fullPath: `${mainLine.name} > ${subLine.name} > ${wordUnit.name}`,
                        display: `${mainLine.name} → ${subLine.name} → ${wordUnit.name}`
                    });
                });
            });
        });

        return breadcrumb;
    };

    const handleSelectLine = (path) => {
        onSelectLine(path);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={40} />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return(
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
            <Typography variant="h6" mb={2}>
                Select Line/ SubLine/ WordUnit
            </Typography>
            {breadcrumbPath.length === 0 ? (
                <Alert severity="info">Not Found Data</Alert>
            ) : (
                <Stack spacing={1}>
                    {breadcrumbPath.map((path, index) => (
                        <Box
                            key={index}
                            sx={{
                                p: 2,
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                cursor: 'pointer',
                                bgcolor: selectedLine?.level5Id === path.level5Id ? 'primary.light' : 'background.default',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    boxShadow: 1
                                },
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => handleSelectLine(path)}
                        >
                            <Breadcrumbs
                                separator={<NavigateNextIcon fontSize="small" />}
                                sx={{ mb: 1 }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    {path.level3}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {path.level4}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color={selectedLine?.level5Id === path.level5Id ? 'primary' : 'text.primary'}
                                >
                                    {path.level5}
                                </Typography>
                            </Breadcrumbs>

                            {selectedLine?.level5Id === path.level5Id && (
                                <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                                    Selected!
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );
};